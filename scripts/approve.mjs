#!/usr/bin/env node
// OWNER ONLY. Records explicit approval of a content item.
// Usage (in your own terminal): npm run approve -- V01 --by "Ömer"
// Requires an interactive terminal and typing the ID to confirm, so agents cannot run it.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { splitFrontmatter, setFrontmatterField, contentHash, validateVideo, parseApprovers } from './lib/content.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const [id] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const byIdx = process.argv.indexOf('--by');
const by = byIdx > -1 ? process.argv[byIdx + 1] : null;

if (!process.stdin.isTTY || !process.stdout.isTTY) { console.error('approve must be run by the owner in an interactive terminal.'); process.exit(1); }
if (!id || !by) { console.error('Usage: npm run approve -- <ID> --by "<approver name>"'); process.exit(1); }

const approvers = parseApprovers(readFileSync(join(ROOT, 'config/channels.md'), 'utf8'));
if (!approvers.includes(by)) { console.error(`"${by}" is not in the approvers list (config/channels.md).`); process.exit(1); }

const dir = join(ROOT, 'content/videos');
const file = readdirSync(dir).find(f => f.startsWith(`${id}-`) && f.endsWith('.md'));
if (!file) { console.error(`No content file for ${id}`); process.exit(1); }
const path = join(dir, file);
let text = readFileSync(path, 'utf8');
const { fm, body } = splitFrontmatter(text);
if (fm.status !== 'in_review') { console.error(`${id} is "${fm.status}". Only in_review items can be approved.`); process.exit(1); }
const { errors } = validateVideo(file, text, { approvers });
if (errors.length) { console.error(`${id} fails validation:\n- ${errors.join('\n- ')}`); process.exit(1); }

console.log(`\n${id}: ${fm.title}\nPillar ${fm.pillar} · ${fm.platforms.join(', ')} · target ${fm.publish_target}\nFile: content/videos/${file}\n`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`Type ${id} to approve it for publishing: `);
rl.close();
if (answer.trim() !== id) { console.log('Not approved.'); process.exit(1); }

text = setFrontmatterField(text, 'status', 'approved');
text = setFrontmatterField(text, 'approved_by', by);
text = setFrontmatterField(text, 'approved_at', new Date().toISOString());
text = setFrontmatterField(text, 'approved_hash', contentHash(body));
writeFileSync(path, text);
console.log(`✔ ${id} approved by ${by}. Publish it manually, then share the post URLs so the file can be marked published.`);
