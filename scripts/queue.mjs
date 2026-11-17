#!/usr/bin/env node
// Lists content by status. Default: what needs owner attention.
// Usage: node scripts/queue.mjs [--all]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { splitFrontmatter } from './lib/content.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const all = process.argv.includes('--all');
const dir = join(ROOT, 'content/videos');
const items = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
  .map(f => ({ file: f, ...splitFrontmatter(readFileSync(join(dir, f), 'utf8')).fm }));

const groups = all ? ['idea', 'draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected'] : ['in_review', 'approved', 'scheduled'];
const labels = { in_review: 'WAITING FOR YOUR APPROVAL', approved: 'APPROVED: ready for you to publish', scheduled: 'SCHEDULED by owner' };
for (const g of groups) {
  const list = items.filter(i => i.status === g).sort((a, b) => String(a.publish_target).localeCompare(String(b.publish_target)));
  if (!list.length) continue;
  console.log(`\n${labels[g] || g.toUpperCase()} (${list.length})`);
  for (const i of list) console.log(`  ${i.id}  ${i.publish_target}  ${i.pillar}  ${String(i.title).slice(0, 60)}  → content/videos/${i.file}`);
}
const waiting = items.filter(i => i.status === 'in_review').length;
console.log(`\n${items.length} items total · ${waiting} waiting for approval`);
if (waiting) console.log('Approve with: npm run approve -- <ID> --by "<your name>"');
