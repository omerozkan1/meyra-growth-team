#!/usr/bin/env node
// OWNER ONLY. In your own terminal:  npm run approve -- V01    |    npm run reject -- V01 "reason"
import { createInterface } from 'node:readline/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { approve, reject, loadPrivateKey, keyDir, currentState } from '../lib/approvals.mjs';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const [decision, id, ...rest] = process.argv.slice(2);
if (!process.stdin.isTTY || !process.stdout.isTTY) { console.error('Decisions must be made by the owner in an interactive terminal (or the local panel).'); process.exit(1); }
if (!['approve', 'reject'].includes(decision) || !/^V\d+$/.test(id || '')) { console.error('Usage: npm run approve -- V01   |   npm run reject -- V01 "reason"'); process.exit(1); }
const ownerFile = join(keyDir(), 'owner.json');
if (!existsSync(ownerFile)) { console.error('Run "npm run owner:setup" first.'); process.exit(1); }
const by = JSON.parse(readFileSync(ownerFile, 'utf8')).name;
const st = currentState(ROOT, id);
console.log(`\n${id}: ${st.fm.title}\nVideo: ${st.video?.file || 'none'} (${st.video?.kind || '-'}, ${st.video?.missing_assets?.length ?? '-'} missing assets)\n`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const reason = decision === 'reject' ? (rest.join(' ') || (await rl.question('Reason: '))) : null;
const typed = await rl.question(`Type ${id} to ${decision}: `);
rl.close();
if (typed.trim() !== id) { console.log('Cancelled.'); process.exit(1); }
try {
  const fn = decision === 'approve' ? approve : reject;
  const rec = fn(ROOT, id, { by, reason, privateKey: loadPrivateKey() });
  console.log(`✔ ${id} ${rec.decision} by ${by} (signed).${decision === 'approve' && rec.video_kind !== 'final' ? ' Note: this is a draft render. Publishing stays blocked until a final render is approved.' : ''}`);
} catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
