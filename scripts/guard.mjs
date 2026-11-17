#!/usr/bin/env node
// Claude Code PreToolUse hook. Reads the tool call JSON on stdin; exit 2 blocks the call and returns the reason to the agent.
import { decide } from './lib/guard-rules.mjs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }
const { block, reason } = decide(input);
if (block) {
  process.stderr.write(`BLOCKED by Meyra guardrails: ${reason}. See config/guardrails.md. Draft the action as a file for the owner instead.\n`);
  process.exit(2);
}
process.exit(0);
