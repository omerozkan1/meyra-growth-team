// Content file parsing + validation rules. Zero dependencies.
import { createHash } from 'node:crypto';

export const STATUSES = ['idea', 'draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected'];
export const APPROVED_STATES = ['approved', 'scheduled', 'published'];
export const PILLARS = ['P1', 'P2', 'P3'];
export const PLATFORMS = ['instagram', 'tiktok', 'youtube'];
export const REQUIRED_FIELDS = ['id', 'title', 'pillar', 'status', 'platforms', 'duration_s', 'language', 'segment', 'cta_type', 'publish_target'];
export const REQUIRED_SECTIONS = ['Hook', 'Script', 'Visual Direction', 'Captions', 'CTA', 'Claims Check'];
export const CAPTION_SUBSECTIONS = ['Instagram', 'TikTok', 'YouTube Shorts'];

// Banned marketing claims. Each entry: [regex, message]. Matched on tr-lowercased text.
export const BANNED_CLAIMS = [
  [/sıfır sapma|zero deviation/, 'absolute accuracy claim ("sıfır sapma")'],
  [/%\s?100 doğru|yüzde yüz doğru|100% accurate/, 'absolute accuracy claim (%100 doğru)'],
  [/diyanet onaylı|diyanet tarafından onaylı|resmi diyanet/, 'implied Diyanet endorsement'],
  [/tamamen ücretsiz|completely free|totally free/, '"tamamen ücretsiz", but the app has Premium and ads'],
  [/en iyi namaz uygulaması|en iyi uygulama|best prayer app/, 'unsubstantiated superlative'],
  [/\bgaranti(li)?\b|guaranteed/, 'guarantee claim'],
  [/fetva ver/, 'AI/app must not be presented as issuing fatwas'],
  [/\d[\d.,]*\s?(bin|milyon|k)\+?\s?(kişi|kullanıcı|indirme)/, 'user/download count claim (verify against store data and remove)'],
];

export function trLower(s) { return String(s).toLocaleLowerCase('tr'); }

export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { fm: null, fmRaw: '', body: text };
  return { fm: parseYamlSubset(m[1]), fmRaw: m[1], body: m[2] };
}

// Supports: `key: value`, `key: [a, "b c"]`, `key:` (empty), `# comments`, numbers, booleans.
export function parseYamlSubset(src) {
  const out = {};
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = parseScalarOrList(m[2].trim());
  }
  return out;
}

function parseScalarOrList(v) {
  if (v === '' || v === '~' || v === 'null') return '';
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let cur = '', q = null;
    for (const ch of inner) {
      if (q) { if (ch === q) q = null; else cur += ch; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ',') { items.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) items.push(cur.trim());
    return items;
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true' || v === 'false') return v === 'true';
  return v.replace(/^["'](.*)["']$/, '$1');
}

export function setFrontmatterField(text, key, value) {
  const { fmRaw } = splitFrontmatter(text);
  const rendered = Array.isArray(value) ? `[${value.map(v => JSON.stringify(v)).join(', ')}]` : String(value);
  const re = new RegExp(`^${key}:.*$`, 'm');
  const newFm = re.test(fmRaw) ? fmRaw.replace(re, `${key}: ${rendered}`) : `${fmRaw}\n${key}: ${rendered}`;
  return text.replace(fmRaw, newFm);
}

export function contentHash(body) {
  return createHash('sha256').update(body.replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 16);
}

export function sections(body) {
  const map = {};
  let cur = null;
  for (const line of body.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { cur = h[1]; map[cur] = ''; continue; }
    if (cur) map[cur] += line + '\n';
  }
  return map;
}

export function subsections(text) {
  const map = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^###\s+(.+?)\s*$/.exec(line);
    if (h) { cur = h[1]; map[cur] = ''; continue; }
    if (cur) map[cur] += line + '\n';
  }
  return map;
}

/**
 * Validate one content file. Returns { errors: string[], warnings: string[] }.
 * @param {string} filename basename, e.g. V01-kalpler-huzur.md
 * @param {string} text file contents
 * @param {{approvers: string[]}} ctx
 */
export function validateVideo(filename, text, ctx = { approvers: [] }) {
  const errors = [], warnings = [];
  const { fm, body } = splitFrontmatter(text);
  if (!fm) return { errors: ['missing YAML frontmatter'], warnings };

  for (const f of REQUIRED_FIELDS) if (fm[f] === undefined || fm[f] === '') errors.push(`missing field: ${f}`);
  if (fm.id && !filename.startsWith(`${fm.id}-`)) errors.push(`filename must start with "${fm.id}-"`);
  if (fm.status && !STATUSES.includes(fm.status)) errors.push(`invalid status "${fm.status}"`);
  if (fm.pillar && !PILLARS.includes(fm.pillar)) errors.push(`invalid pillar "${fm.pillar}"`);
  if (fm.platforms && (!Array.isArray(fm.platforms) || fm.platforms.some(p => !PLATFORMS.includes(p)))) errors.push(`platforms must be a list of ${PLATFORMS.join('/')}`);
  if (fm.cta_type && !['soft', 'direct'].includes(fm.cta_type)) errors.push('cta_type must be soft|direct');
  if (fm.publish_target && !/^\d{4}-\d{2}-\d{2}$/.test(String(fm.publish_target))) errors.push('publish_target must be YYYY-MM-DD');

  // Approval integrity
  const approvedState = APPROVED_STATES.includes(fm.status);
  if (approvedState) {
    if (!fm.approved_by || !ctx.approvers.includes(fm.approved_by)) errors.push(`status "${fm.status}" requires approved_by to be a listed approver (config/channels.md)`);
    if (!fm.approved_at || Number.isNaN(Date.parse(fm.approved_at))) errors.push('approved_at missing/invalid');
    if (fm.approved_hash !== contentHash(body)) errors.push('content changed after approval (approved_hash mismatch). Set status back to in_review for re-approval');
  } else if (fm.approved_by || fm.approved_at || fm.approved_hash) {
    errors.push(`approval fields must be empty while status is "${fm.status}" (only the owner's approve script sets them)`);
  }
  if (fm.status === 'published' && !(Array.isArray(fm.published_urls) && fm.published_urls.length)) errors.push('published requires published_urls');

  // Structure
  const sec = sections(body);
  for (const s of REQUIRED_SECTIONS) if (!(s in sec) || !sec[s].trim()) errors.push(`missing/empty section: ## ${s}`);
  if (sec.Captions) {
    const sub = subsections(sec.Captions);
    for (const s of CAPTION_SUBSECTIONS) if (!(s in sub) || !sub[s].trim()) errors.push(`missing caption: ### ${s}`);
    for (const [name, cap] of Object.entries(sub)) {
      const len = cap.trim().length;
      if (len > 2200) errors.push(`${name} caption too long (${len} > 2200)`);
      const tags = cap.match(/#[\p{L}\p{N}_]+/gu) || [];
      if (tags.length > 5) warnings.push(`${name}: ${tags.length} hashtags (brand rule: max 5)`);
    }
    const yt = sub['YouTube Shorts'] || '';
    const title = /^\s*(?:\*\*)?(?:Başlık|Title)(?:\*\*)?:\s*(.+)$/mi.exec(yt);
    if (!title) errors.push('YouTube Shorts caption needs a "Başlık:" line');
    else if (title[1].trim().length > 100) errors.push(`YouTube title too long (${title[1].trim().length} > 100)`);
  }

  // Claims
  const lowerLines = body.split(/\r?\n/).map(trLower);
  lowerLines.forEach((line, i) => {
    if (/^\s*[-*]?\s*(banned|yasak|❌)/.test(line)) return; // lines that *list* banned claims in Claims Check
    for (const [re, msg] of BANNED_CLAIMS) if (re.test(line)) errors.push(`line ${i + 1}: banned claim: ${msg}`);
    if (/reklamsız|ad-free/.test(line) && !/premium/.test(line)) errors.push(`line ${i + 1}: "reklamsız" only allowed when describing Premium`);
  });

  // Religious sources
  const religiousRef = /\bayet|sure(si)?\b|\bhadis|kur'an'da|\(\s*[\p{L}'’ -]+\s+\d+:\d+\s*\)/u;
  if (religiousRef.test(trLower(sec.Script || '') + trLower(sec.Hook || '')) && !(Array.isArray(fm.sources) && fm.sources.length)) {
    errors.push('script references a verse/hadith; frontmatter "sources" must list exact references');
  }

  // Links must be tracked
  const urls = body.match(/https?:\/\/[^\s)>\]]+/g) || [];
  for (const u of urls) {
    if (/meyraapp\.com|apps\.apple\.com|play\.google\.com/.test(u) && !/utm_|referrer=|[?&]ct=/.test(u)) warnings.push(`untracked link: ${u} (use npm run links)`);
  }
  return { errors, warnings, fm };
}

// ---- secrets ----
export const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/sk-(ant-|proj-)?[A-Za-z0-9_-]{20,}/, 'API secret key (sk-…)'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/"private_key"\s*:\s*"-----BEGIN/, 'service account JSON'],
  [/EAA[A-Za-z0-9]{40,}/, 'Meta access token'],
  [/ya29\.[0-9A-Za-z_-]{20,}/, 'Google OAuth token'],
  [/gh[pousr]_[A-Za-z0-9]{36}/, 'GitHub token'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
];

export function scanSecrets(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [re, label] of SECRET_PATTERNS) if (re.test(line)) hits.push({ line: i + 1, label });
  });
  return hits;
}

export function parseApprovers(channelsMd) {
  const m = /```approvers\r?\n([\s\S]*?)```/.exec(channelsMd);
  return m ? m[1].split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
}
