#!/usr/bin/env node
// OWNER ONLY, run once in your own terminal: creates your approval signing key in ~/.meyra (outside the repo)
// and writes the public key to config/approver_ed25519.pub.pem.
import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateOwnerKeys, keyDir } from '../lib/approvals.mjs';
import { parseApprovers } from '../lib/content.mjs';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
if (!process.stdin.isTTY || !process.stdout.isTTY) { console.error('Run this yourself in an interactive terminal.'); process.exit(1); }
const approvers = parseApprovers(readFileSync(join(ROOT, 'config/channels.md'), 'utf8'));
const rl = createInterface({ input: process.stdin, output: process.stdout });
const name = (await rl.question(`Your approver name (${approvers.join(' / ')}): `)).trim();
rl.close();
if (!approvers.includes(name)) { console.error('Name must be one of the approvers in config/channels.md'); process.exit(1); }
generateOwnerKeys(ROOT, keyDir(), { name });
console.log(`✔ Private key + panel token saved in ${keyDir()} (chmod 600). Public key: config/approver_ed25519.pub.pem`);
console.log('Never share ~/.meyra. Agents are blocked from reading it.');
