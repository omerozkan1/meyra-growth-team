#!/usr/bin/env node
// Validates content files, approval integrity, calendar consistency and scans the repo for secrets.
// Usage: node scripts/validate.mjs [--secrets-only] [--strict]   (strict = warnings fail too)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { validateVideo, scanSecrets, parseApprovers, splitFrontmatter } from './lib/content.mjs';
import { verifyApproval } from './lib/approvals.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const secretsOnly = args.includes('--secrets-only');
const strict = args.includes('--strict');
let errorCount = 0, warnCount = 0;
const err = (f, m) => { errorCount++; console.log(`✖ ${f}: ${m}`); };
const warn = (f, m) => { warnCount++; console.log(`⚠ ${f}: ${m}`); };

// 1. Secrets scan
const SKIP_DIRS = new Set(['.git', 'node_modules', 'assets']);
const TEXT_EXT = /\.(md|mjs|js|json|csv|txt|ya?ml|html|env\.example|sh|toml)$|^\.[a-z]+$/;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name === '.env' || /^\.env\./.test(name) && name !== '.env.example') continue; // ignored by git; never read
    else if (TEXT_EXT.test(name) && st.size < 2_000_000) {
      for (const h of scanSecrets(readFileSync(p, 'utf8'))) err(relative(ROOT, p), `line ${h.line}: possible ${h.label}`);
    }
  }
}
walk(ROOT);
const gi = existsSync(join(ROOT, '.gitignore')) ? readFileSync(join(ROOT, '.gitignore'), 'utf8') : '';
if (!/^\.env$/m.test(gi)) err('.gitignore', 'must ignore .env');

if (!secretsOnly) {
  // 2. Content files
  const approvers = parseApprovers(readFileSync(join(ROOT, 'config/channels.md'), 'utf8'));
  if (!approvers.length) err('config/channels.md', 'no approvers block found');
  const vdir = join(ROOT, 'content/videos');
  const files = readdirSync(vdir).filter(f => f.endsWith('.md')).sort();
  const ids = new Map();
  for (const f of files) {
    const text = readFileSync(join(vdir, f), 'utf8');
    const { errors, warnings, fm } = validateVideo(f, text, { approvers });
    errors.forEach(e => err(`content/videos/${f}`, e));
    warnings.forEach(w => warn(`content/videos/${f}`, w));
    if (fm && ['approved', 'scheduled', 'published'].includes(fm.status)) {
      const v = verifyApproval(ROOT.replace(/\/$/, ''), fm.id);
      if (!v.ok) v.reasons.forEach(r => err(`content/videos/${f}`, `approval not valid: ${r}`));
    }
    if (fm?.id) { if (ids.has(fm.id)) err(`content/videos/${f}`, `duplicate id ${fm.id} (also ${ids.get(fm.id)})`); ids.set(fm.id, f); }
  }

  // 3. Calendar references existing videos
  const cal = join(ROOT, 'content/calendar.csv');
  if (existsSync(cal)) {
    const [head, ...rows] = readFileSync(cal, 'utf8').trim().split(/\r?\n/);
    const cols = head.split(',');
    const iv = cols.indexOf('video_id'), id = cols.indexOf('date'), it = cols.indexOf('working_title');
    rows.forEach((r, i) => {
      const c = r.split(',');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c[id])) err('content/calendar.csv', `row ${i + 2}: bad date`);
      const vid = c[iv];
      if (vid && /^V\d+$/.test(vid) && !ids.has(vid) && !/^TBD/.test(c[it] || '')) warn('content/calendar.csv', `row ${i + 2}: ${vid} has no concept file yet`);
    });
  }
  console.log(`\nChecked ${files.length} video files.`);
}

console.log(`${errorCount} error(s), ${warnCount} warning(s)`);
process.exit(errorCount || (strict && warnCount) ? 1 : 0);
