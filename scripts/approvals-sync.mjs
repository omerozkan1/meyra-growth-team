#!/usr/bin/env node
// Pipeline step (safe for agents): package every rendered, undecided video into approvals/pending,
// and invalidate approvals whose files changed. Never approves anything.
// Usage: node scripts/approvals-sync.mjs [--json]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitFrontmatter } from './lib/content.mjs';
import { writePending, invalidateIfStale, currentState } from './lib/approvals.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

export function syncApprovals(root = ROOT) {
  const out = { packaged: [], blocked: [], unchanged: [], invalidated: [], skipped: [] };
  for (const f of readdirSync(join(root, 'content/videos')).filter(x => /^V\d+-.*\.md$/.test(x)).sort()) {
    const id = f.split('-')[0];
    const { fm } = splitFrontmatter(readFileSync(join(root, 'content/videos', f), 'utf8'));
    const inv = invalidateIfStale(root, id);
    if (inv) out.invalidated.push({ id, reasons: inv });
    const status = inv ? 'in_review' : fm.status;
    if (['approved', 'scheduled', 'published', 'idea'].includes(status)) { out.skipped.push({ id, status }); continue; }
    if (!currentState(root, id).video) { out.skipped.push({ id, status, why: 'not rendered' }); continue; }
    const pkg = writePending(root, id);
    if (!pkg) out.unchanged.push(id);
    else (pkg.qc.status === 'ready' ? out.packaged : out.blocked).push({ id, reasons: pkg.qc.reasons });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = syncApprovals();
  if (process.argv.includes('--json')) console.log(JSON.stringify(out));
  else {
    console.log(`pending ready:   ${out.packaged.map(x => x.id).join(', ') || '-'}`);
    console.log(`pending blocked: ${out.blocked.map(x => `${x.id} (${x.reasons.length} issue(s))`).join(', ') || '-'}`);
    if (out.invalidated.length) console.log(`approvals invalidated: ${out.invalidated.map(x => `${x.id}: ${x.reasons.join('; ')}`).join(' | ')}`);
  }
}
