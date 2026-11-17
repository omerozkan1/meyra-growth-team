#!/usr/bin/env node
// Publish gate. Real publishing is NOT implemented: no platform is connected. Only --dry-run exists.
// Usage: node scripts/publish/publish.mjs V01 --platform instagram|tiktok|youtube|all --dry-run
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { canPublish, currentState } from '../lib/approvals.mjs';

const ROOT = (process.env.MEYRA_ROOT || new URL('../..', import.meta.url).pathname).replace(/\/$/, '');
const args = process.argv.slice(2);
const id = args.find(a => /^V\d+$/.test(a));
const pi = args.indexOf('--platform');
const platform = pi > -1 ? args[pi + 1] : 'all';
const dryRun = args.includes('--dry-run') || process.env.MEYRA_DRY_RUN === '1';
if (!id) { console.error('Usage: publish.mjs V01 --platform instagram --dry-run'); process.exit(2); }

const gate = canPublish(ROOT, id);
if (!gate.ok) {
  console.error(`✖ PUBLISH REFUSED for ${id}:\n  - ${gate.reasons.join('\n  - ')}`);
  process.exit(3);
}
if (!dryRun) {
  console.error('✖ Real publishing is disabled: no platform API is connected (see docs/social-api-requirements.md). Use --dry-run.');
  process.exit(4);
}
const st = currentState(ROOT, id);
const platforms = platform === 'all' ? st.fm.platforms : [platform];
mkdirSync(join(ROOT, 'approvals/outbox-dryrun'), { recursive: true });
const WOULD = {
  instagram: 'POST /{ig-user-id}/media (media_type=REELS, video_url) → POST /{ig-user-id}/media_publish',
  tiktok: 'POST /v2/post/publish/inbox/video/init/ (upload as draft to the creator inbox)',
  youtube: 'POST youtube/v3/videos?part=snippet,status (privacyStatus=private)',
};
for (const p of platforms) {
  const plan = { dry_run: true, id, platform: p, video: st.video.file, video_sha256: st.video.sha256, caption: st.captions[p], created_at: new Date().toISOString(), would_call: WOULD[p] };
  const f = join(ROOT, 'approvals/outbox-dryrun', `${new Date().toISOString().slice(0, 10)}-${id}-${p}.json`);
  writeFileSync(f, JSON.stringify(plan, null, 2));
  console.log(`DRY-RUN ok: ${id} → ${p} (nothing sent). Plan: ${f.slice(ROOT.length + 1)}`);
}
