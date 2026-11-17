// Guard v2: decides whether an AGENT tool call must be blocked (Claude Code PreToolUse hook).
// The owner's own terminal is never affected by hooks.
//
// v2 change: rules look at what a command EXECUTES, not at text it merely contains. Writing a note that
// mentions "npm run approve" is fine; running it is blocked. Heredoc bodies are data unless fed to an interpreter.
//
// This is a guardrail, not a sandbox: an agent that may run arbitrary code could bypass it. Unattended runs
// therefore also use a strict tool allowlist (scripts/daily/run-daily.sh).
export const VERSION = 2;

const OWNER_NPM_SCRIPTS = /^(approve|reject|panel|owner:[\w:-]+)$/;
const OWNER_SCRIPT_PATH = /(^|\/)(approve\.mjs|scripts\/owner\/[\w.-]+|owner\/(decide|setup)\.mjs|scripts\/panel\/server\.mjs)$/;
const INTERPRETERS = new Set(['node', 'bun', 'deno', 'tsx', 'ts-node', 'python', 'python3', 'ruby', 'perl', 'sh', 'bash', 'zsh', 'osascript']);
const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'xargs', 'nice', 'caffeinate']);
const TEXT_ONLY = new Set(['echo', 'printf', 'true', ':']);
const WRITE_CMDS = new Set(['cp', 'mv', 'tee', 'rm', 'sed', 'ln', 'chmod', 'chown', 'truncate', 'dd', 'install', 'rsync', 'touch']);

export const PROTECTED_WRITE = [
  /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/,
  /(^|\/)\.claude\/settings(\.local)?\.json$/,
  /(^|\/)scripts\/(guard\.mjs|approve\.mjs|lib\/guard-rules\.mjs|lib\/approvals\.mjs)$/,
  /(^|\/)scripts\/(guard-staged|owner|publish|panel)\//,
  /(^|\/)config\/approver_ed25519\.pub\.pem$/,
  /(^|\/)approvals\/(approved|rejected|invalidated)\//,
  /(^|\/)\.meyra(\/|$)/,
  /(^|\/)package\.json$/,
  /(^|\/)\.githooks\//,
];
const SECRET_READ = [
  /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/,
  /(^|\/)\.meyra(\/|$)/,
  /approver_ed25519\.pem$/,
  /(^|\/)panel-token$/,
];

const NETWORK_RULES = [
  [/graph\.facebook\.com|graph\.instagram\.com|business\.facebook\.com/, 'Meta API calls are disabled (no publishing/messaging by agents)'],
  [/open\.tiktokapis\.com|open-api\.tiktok\.com|business-api\.tiktok\.com/, 'TikTok API calls are disabled for agents'],
  [/upload\.youtube|googleapis\.com\/upload|youtube\/v3\/(videos|commentThreads|comments)/, 'YouTube write calls are disabled'],
  [/api\.(twitter|x)\.com/, 'X/Twitter API calls are disabled'],
  [/googleads\.googleapis|adwords|ads\.tiktok|adsmanager/i, 'ad platform calls are disabled (no ad spend)'],
  [/androidpublisher\.googleapis\.com/, 'Play Developer Publishing API is disabled'],
  [/api\.appstoreconnect\.apple\.com.*-X\s*(POST|PATCH|PUT|DELETE)/i, 'App Store Connect write calls are disabled'],
  [/(\s-X\s*(POST|PUT|PATCH|DELETE)|\s--request\s+(POST|PUT|PATCH|DELETE)|\s--data(-\w+)?[\s=]|\s-d\s|\s-F\s|\s--form\s|--upload-file|\s-T\s)/i, 'outbound write requests (POST/PUT/PATCH/DELETE/upload) are disabled; agents read only'],
];

// ---------------------------------------------------------------- shell parsing (good enough, conservative)
function stripHeredocs(cmd, extra) {
  return cmd.replace(/^([^\n]*?)<<-?\s*(['"]?)([A-Za-z_]\w*)\2([^\n]*)\n([\s\S]*?)\n[ \t]*\3[ \t]*(?=\n|$)/gm, (m, before, _q, _tag, after, body) => {
    const words = (before + ' ' + after).trim().split(/[\s|;&]+/).map(w => w.split('/').pop());
    if (words.some(w => INTERPRETERS.has(w))) extra.push(body); // body will be executed: analyse it too
    return `${before}<<HEREDOC${after}`;
  });
}

/** Split into simple commands at unquoted ; && || | & newlines; also extracts $( ) and backtick bodies. */
export function splitCommands(cmd) {
  const extra = [];
  const src = stripHeredocs(cmd, extra);
  const out = [];
  let cur = '', q = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '\\' && q === '"') { cur += c + (src[++i] ?? ''); continue; }
      if (c === q) q = null;
      cur += c;
      continue;
    }
    if (c === "'" || c === '"') { q = c; cur += c; continue; }
    if (c === '\\') { cur += c + (src[++i] ?? ''); continue; }
    if (c === '`') { const j = src.indexOf('`', i + 1); if (j > i) { extra.push(src.slice(i + 1, j)); i = j; continue; } }
    if (c === '$' && src[i + 1] === '(') {
      let depth = 1, j = i + 2;
      while (j < src.length && depth) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      extra.push(src.slice(i + 2, j - 1)); cur += '$SUBST'; i = j - 1; continue;
    }
    if (c === ';' || c === '\n' || c === '|' || c === '&' || c === '(' || c === ')') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  for (const e of extra) out.push(...splitCommands(e));
  return out;
}

export function tokenize(simple) {
  const toks = [];
  let cur = '', q = null, has = false;
  for (let i = 0; i < simple.length; i++) {
    const c = simple[i];
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; has = true; continue; }
    if (c === '\\') { cur += simple[++i] ?? ''; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) toks.push(cur); cur = ''; has = false; continue; }
    cur += c; has = true;
  }
  if (cur || has) toks.push(cur);
  return toks;
}

function commandWords(toks) {
  let i = 0;
  while (i < toks.length && (/^\w+=/.test(toks[i]) || WRAPPERS.has(toks[i].split('/').pop()))) {
    i++;
    while (i < toks.length && toks[i].startsWith('-')) i++; // wrapper flags
  }
  return toks.slice(i);
}

const base = p => String(p).split('/').pop();
const block = reason => ({ block: true, reason });

function checkSimple(simple, depth) {
  const toks = commandWords(tokenize(simple));
  if (!toks.length) return { block: false };
  const cmd = base(toks[0]);
  const args = toks.slice(1);

  // secrets: any command but echo/printf touching .env / owner key material
  if (!TEXT_ONLY.has(cmd)) {
    for (const t of toks.slice(1)) {
      if (SECRET_READ.some(re => re.test(t.replace(/^[<>]+/, '')))) return block('accessing secrets (.env, ~/.meyra, owner key) is disabled for agents');
    }
  }
  if (TEXT_ONLY.has(cmd)) {
    // only redirections can make echo dangerous
    const redir = simple.match(/>>?\s*(\S+)/);
    if (redir && PROTECTED_WRITE.some(re => re.test(redir[1].replace(/['"]/g, '')))) return block('writing to a protected file is disabled for agents');
    return { block: false };
  }

  // nested shells / eval
  if (['sh', 'bash', 'zsh'].includes(cmd)) {
    const ci = args.indexOf('-c');
    if (ci > -1 && args[ci + 1] && depth < 4) return checkBash(args[ci + 1], depth + 1);
    const script = args.find(a => !a.startsWith('-'));
    if (script && OWNER_SCRIPT_PATH.test(script)) return block('owner-only scripts cannot be run by agents');
  }
  if (cmd === 'eval' && depth < 4) return checkBash(args.join(' '), depth + 1);

  // owner-only actions
  if (OWNER_SCRIPT_PATH.test(toks[0])) return block('owner-only scripts cannot be run by agents');
  if (INTERPRETERS.has(cmd)) {
    const ei = args.findIndex(a => a === '-e' || a === '-c' || a === '--eval');
    if (ei > -1 && depth < 4) {
      const code = args[ei + 1] || '';
      if (/approve\.mjs|scripts\/owner|approvals\.mjs.*\b(approve|reject)\b|\.meyra|approver_ed25519\.pem/.test(code)) return block('inline code touching approvals/owner keys is disabled for agents');
      for (const [re, reason] of NETWORK_RULES.slice(0, 7)) if (re.test(code)) return block(reason);
    }
    const script = args.find(a => !a.startsWith('-'));
    if (script && OWNER_SCRIPT_PATH.test(script)) return block('only the owner can approve/reject (run it in your own terminal or the panel)');
    if (script && /(^|\/)scripts\/publish\/publish\.mjs$/.test(script) && !args.includes('--dry-run')) return block('publishing is owner-only; agents may only use --dry-run');
  }
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(cmd)) {
    const ri = args.findIndex(a => a === 'run' || a === 'run-script');
    const name = ri > -1 ? args[ri + 1] : (cmd === 'yarn' ? args[0] : null);
    if (name && OWNER_NPM_SCRIPTS.test(name)) return block('only the owner can approve/reject or set up keys (run it in your own terminal or the panel)');
    if (name && /^publish(?!:dry-run$)/.test(name)) return block('publishing is owner-only; agents may only use publish:dry-run');
  }

  // git
  if (cmd === 'git') {
    const sub = args.find(a => !a.startsWith('-'));
    if (sub === 'push') return block('git push is disabled for agents (owner pushes manually)');
    if (sub === 'remote' && /\b(add|set-url)\b/.test(args.join(' '))) return block('adding git remotes is disabled for agents');
    if (sub === 'config' && /core\.hooksPath/.test(args.join(' '))) return block('changing git hooks is disabled for agents');
  }

  // network / deploy / messaging
  if (['curl', 'wget', 'http', 'https', 'xh', 'httpie'].includes(cmd) || INTERPRETERS.has(cmd)) {
    for (const [re, reason] of NETWORK_RULES) {
      if (re === NETWORK_RULES[NETWORK_RULES.length - 1][0] && !['curl', 'wget', 'http', 'https', 'xh', 'httpie'].includes(cmd)) continue;
      if (re.test(' ' + simple)) return block(reason);
    }
  }
  if (['sendmail', 'mail', 'mailx', 'msmtp'].includes(cmd)) return block('sending email/messages is disabled');
  if ((['vercel', 'netlify'].includes(cmd) && /\b(deploy|--prod)\b/.test(simple)) || (cmd === 'firebase' && args[0] === 'deploy') || cmd === 'fastlane' ||
      (cmd === 'eas' && /^(submit|update)$/.test(args[0] || '')) || (cmd === 'gcloud' && /\bdeploy\b/.test(simple))) return block('production deploys are disabled for agents');
  if (cmd === 'launchctl' && /\b(bootout|unload|disable|remove)\b/.test(simple) && /com\.meyra/.test(simple)) return block('changing the Meyra schedule is owner-only');

  // writes to protected paths
  const redirTargets = [...simple.matchAll(/>>?\s*(\S+)/g)].map(m => m[1].replace(/['"]/g, ''));
  const writeTargets = WRITE_CMDS.has(cmd) ? args.filter(a => !a.startsWith('-')) : [];
  for (const t of [...redirTargets, ...writeTargets]) {
    if (PROTECTED_WRITE.some(re => re.test(t))) return block(`writing to protected path "${t}" is disabled for agents`);
  }
  return { block: false };
}

export function checkBash(command, depth = 0) {
  for (const simple of splitCommands(String(command || ''))) {
    const r = checkSimple(simple, depth);
    if (r.block) return r;
  }
  return { block: false };
}

export function checkFileWrite(filePath, newText) {
  const p = String(filePath || '');
  if (PROTECTED_WRITE.some(re => re.test(p))) return block('this file is owner-maintained (guardrails, approvals, keys, package.json); propose the change instead');
  if (/content\/.*\.md$/.test(p) && newText) {
    if (/^\s*approved_by:[ \t]*\S/m.test(newText) || /^\s*approved_hash:[ \t]*\S/m.test(newText) || /^\s*approved_at:[ \t]*\S/m.test(newText) || /^\s*status:[ \t]*(approved|scheduled)\b/m.test(newText)) {
      return block('agents cannot set approval fields or approved/scheduled status; the owner decides via the panel or terminal');
    }
  }
  return { block: false };
}

export function checkRead(filePath) {
  const p = String(filePath || '');
  if (SECRET_READ.some(re => re.test(p))) return block('reading secrets (.env, ~/.meyra, owner key) is disabled for agents');
  return { block: false };
}

export function decide(input) {
  const tool = input?.tool_name;
  const ti = input?.tool_input || {};
  if (tool === 'Bash') return checkBash(ti.command || '');
  if (tool === 'Write') return checkFileWrite(ti.file_path, ti.content);
  if (tool === 'Edit') return checkFileWrite(ti.file_path, ti.new_string);
  if (tool === 'MultiEdit') return checkFileWrite(ti.file_path, (ti.edits || []).map(e => e.new_string).join('\n'));
  if (tool === 'NotebookEdit') return checkFileWrite(ti.notebook_path, ti.new_source);
  if (tool === 'Read') return checkRead(ti.file_path);
  if (tool === 'Grep' || tool === 'Glob') return checkRead(ti.path || '');
  return { block: false };
}
