// Decides whether an agent tool call must be blocked. Used by scripts/guard.mjs (Claude Code PreToolUse hook).

const BASH_RULES = [
  [/\bgit\s+push\b/, 'git push is disabled for agents (owner pushes manually)'],
  [/\bgit\s+remote\s+(add|set-url)\b/, 'adding git remotes is disabled for agents'],
  [/approve\.mjs|npm\s+run\s+approve|npm\s+run-script\s+approve/, 'only the owner can approve content (run it in your own terminal)'],
  [/graph\.facebook\.com|graph\.instagram\.com|business\.facebook\.com/, 'Meta API calls are disabled (no publishing/messaging by agents)'],
  [/open\.tiktokapis\.com|open-api\.tiktok\.com|business-api\.tiktok\.com/, 'TikTok API calls are disabled for agents'],
  [/upload\.youtube|googleapis\.com\/upload|youtube\/v3\/(videos|commentThreads|comments)\b.*(-X\s*(POST|PUT|DELETE)|--data|\s-d\s)/i, 'YouTube write calls are disabled'],
  [/api\.(twitter|x)\.com/, 'X/Twitter API calls are disabled'],
  [/googleads\.googleapis|adwords|ads\.tiktok|adsmanager/i, 'ad platform calls are disabled (no ad spend)'],
  [/androidpublisher\.googleapis\.com/, 'Play Developer Publishing API is disabled (no store/review changes); use Play Console exports'],
  [/api\.appstoreconnect\.apple\.com.*-X\s*(POST|PATCH|PUT|DELETE)/i, 'App Store Connect write calls are disabled'],
  [/\b(curl|wget|http|xh)\b[^|;&]*(\s-X\s*(POST|PUT|PATCH|DELETE)|\s--data(-\w+)?[\s=]|\s-d\s|\s-F\s|\s--form\s|--upload-file|\s-T\s)/i, 'outbound write requests (POST/PUT/PATCH/DELETE/upload) are disabled; agents read only'],
  [/\b(sendmail|mailx?|msmtp|osascript\b.*(Mail|Messages))\b/, 'sending email/messages is disabled'],
  [/\b(vercel|netlify)\b.*\b(deploy|--prod)\b|\bfirebase\s+deploy\b|\bfastlane\b|\beas\s+(submit|update)\b|\bgcloud\b.*\bdeploy\b/, 'production deploys are disabled for agents'],
];

// Any shell token that is a .env file (except .env.example) means the command touches secrets.
export function touchesEnvFile(command) {
  return command.split(/[\s;&|<>()=]+/).map(t => t.replace(/^['"]|['"]$/g, '').split('/').pop())
    .some(t => t === '.env' || (/^\.env\.[\w.-]+$/.test(t) && t !== '.env.example'));
}

export function checkBash(command) {
  for (const [re, reason] of BASH_RULES) if (re.test(command)) return { block: true, reason };
  if (touchesEnvFile(command)) return { block: true, reason: 'commands touching .env are disabled for agents (secrets); the owner manages it' };
  return { block: false };
}

export function checkFileWrite(filePath, newText) {
  const p = String(filePath || '');
  if (/(^|\/)\.env(\.(?!example$)[\w.-]+)?$/.test(p)) return { block: true, reason: 'agents must not write .env files; the owner manages secrets' };
  if (/\.claude\/settings(\.local)?\.json$/.test(p) || /scripts\/(guard\.mjs|lib\/guard-rules\.mjs|approve\.mjs)$/.test(p)) {
    return { block: true, reason: 'guardrail files are owner-maintained; propose the change instead' };
  }
  if (/content\/.*\.md$/.test(p) && newText) {
    if (/^\s*approved_by:[ \t]*\S/m.test(newText) || /^\s*approved_hash:[ \t]*\S/m.test(newText) || /^\s*approved_at:[ \t]*\S/m.test(newText) || /^\s*status:[ \t]*(approved|scheduled)\b/m.test(newText)) {
      return { block: true, reason: 'agents cannot set approval fields or approved/scheduled status. Use Edit on other lines only; the owner approves via `npm run approve`' };
    }
  }
  return { block: false };
}

export function decide(input) {
  const tool = input?.tool_name;
  const ti = input?.tool_input || {};
  if (tool === 'Bash') return checkBash(ti.command || '');
  if (tool === 'Write') return checkFileWrite(ti.file_path, ti.content);
  if (tool === 'Edit') return checkFileWrite(ti.file_path, ti.new_string);
  if (tool === 'MultiEdit') return checkFileWrite(ti.file_path, (ti.edits || []).map(e => e.new_string).join('\n'));
  return { block: false };
}
