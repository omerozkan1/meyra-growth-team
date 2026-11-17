import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { decide } from '../scripts/lib/guard-rules.mjs';

const bash = command => decide({ tool_name: 'Bash', tool_input: { command } });

test('blocks publishing / outbound writes', () => {
  for (const c of [
    'git push origin main',
    'npm run approve -- V01 --by Ömer',
    'node scripts/approve.mjs V01',
    'curl -X POST https://graph.facebook.com/v21.0/123/media',
    'curl https://graph.instagram.com/me/media',
    'curl -d "a=b" https://example.com/api',
    'curl --data-binary @x.json https://example.com',
    'curl -F file=@v.mp4 https://open.tiktokapis.com/v2/post/publish/',
    'vercel deploy --prod',
    'firebase deploy',
    'cat .env',
    'cp .env /tmp/x',
    'curl https://androidpublisher.googleapis.com/androidpublisher/v3/applications/x/reviews/1:reply',
  ]) assert.equal(bash(c).block, true, c);
});

test('allows read-only and local work', () => {
  for (const c of [
    'npm run validate', 'npm test', 'npm run queue', 'npm run links',
    'curl -sL https://meyraapp.com/tr', 'git status', 'git add -A', 'cat .env.example', 'ls content/videos',
  ]) assert.equal(bash(c).block, false, c);
});

test('blocks agent writes of approval fields, allows normal edits', () => {
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: '/r/content/videos/V01-x.md', new_string: 'status: approved' } }).block, true);
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: '/r/content/videos/V01-x.md', new_string: 'approved_by: Ömer' } }).block, true);
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: '/r/content/videos/V01-x.md', new_string: 'status: in_review' } }).block, false);
  // empty approval fields followed by other lines must NOT be read as filled
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/content/videos/V01-x.md', content: 'approved_by:\napproved_at:\napproved_hash:\npublished_urls: []' } }).block, false);
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/.env', content: 'X=1' } }).block, true);
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/.env.example', content: 'X=' } }).block, false);
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/.claude/settings.json', content: '{}' } }).block, true);
});

test('hook CLI exits 2 with reason on block, 0 otherwise', () => {
  const run = input => spawnSync('node', ['scripts/guard.mjs'], { input: JSON.stringify(input), encoding: 'utf8' });
  const blocked = run({ tool_name: 'Bash', tool_input: { command: 'git push' } });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /BLOCKED/);
  assert.equal(run({ tool_name: 'Bash', tool_input: { command: 'ls' } }).status, 0);
});
