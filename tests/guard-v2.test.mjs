import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, checkBash, splitCommands } from '../scripts/guard-staged/guard-rules.mjs';

const bash = command => checkBash(command);

test('v2: still blocks everything v1 blocked', () => {
  for (const c of [
    'git push origin main',
    'npm run approve -- V01',
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

test('v2: FIX, mentioning owner commands in text/heredocs/notes is allowed', () => {
  for (const c of [
    "cat > notes.md <<'EOF'\nApprove with: npm run approve -- V01\nEOF",
    'echo "run npm run approve -- V01 in your terminal"',
    'grep -n "npm run approve" README.md',
    'printf "%s\\n" "node scripts/owner/decide.mjs approve V01"',
    'git commit -m "docs: explain npm run approve"',
  ]) assert.equal(bash(c).block, false, c);
});

test('v2: executing owner actions is blocked in every form', () => {
  for (const c of [
    'npm run approve -- V01',
    'npm run reject -- V01 bad',
    'npm run owner:setup',
    'yarn approve V01',
    'node scripts/owner/decide.mjs approve V01',
    'node ./scripts/owner/decide.mjs approve V01',
    'cd /x && node scripts/owner/decide.mjs approve V01',
    'FOO=1 npm run approve -- V01',
    'sudo node scripts/owner/decide.mjs approve V01',
    'bash -c "npm run approve -- V01"',
    'sh -c \'node scripts/owner/decide.mjs approve V01\'',
    'eval "npm run approve -- V01"',
    'echo ok && $(npm run approve -- V01)',
    'echo ok; `node scripts/owner/decide.mjs approve V01`',
    "bash <<'EOF'\nnpm run approve -- V01\nEOF",
    'node -e "import(\'./scripts/lib/approvals.mjs\').then(m=>m.approve())"',
    './scripts/owner/apply-guard-update.sh',
    'bash scripts/owner/apply-guard-update.sh',
    'npm run panel',
    'node scripts/panel/server.mjs --open',
  ]) assert.equal(bash(c).block, true, c);
});

test('v2: publishing only as dry-run', () => {
  assert.equal(bash('node scripts/publish/publish.mjs V01 --platform instagram').block, true);
  assert.equal(bash('npm run publish:real -- V01').block, true);
  assert.equal(bash('node scripts/publish/publish.mjs V01 --platform instagram --dry-run').block, false);
  assert.equal(bash('npm run publish:dry-run -- V01').block, false);
});

test('v2: owner key material and secrets are unreadable', () => {
  for (const c of ['cat ~/.meyra/approver_ed25519.pem', 'ls ~/.meyra', 'grep x .env', 'cat /Users/omer/.meyra/panel-token', 'node -e "require(\'fs\').readFileSync(process.env.HOME+\'/.meyra/x\')"'])
    assert.equal(bash(c).block, true, c);
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: '/Users/omer/.meyra/approver_ed25519.pem' } }).block, true);
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: '/r/.env' } }).block, true);
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: '/r/.env.example' } }).block, false);
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: '/r/config/approver_ed25519.pub.pem' } }).block, false);
});

test('v2: protected files cannot be written by tools or shell', () => {
  for (const p of ['/r/approvals/approved/V01.json', '/r/scripts/owner/decide.mjs', '/r/scripts/lib/approvals.mjs', '/r/config/approver_ed25519.pub.pem', '/r/package.json', '/r/.claude/settings.json', '/r/scripts/lib/guard-rules.mjs'])
    assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: p, content: '{}' } }).block, true, p);
  for (const c of ['echo {} > approvals/approved/V01.json', 'cp x.json approvals/approved/V01.json', 'sed -i "" s/a/b/ scripts/lib/approvals.mjs', 'tee package.json < x'])
    assert.equal(bash(c).block, true, c);
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/approvals/pending/V01.json', content: '{}' } }).block, false);
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/content/videos/V11-x.md', content: 'status: in_review\napproved_by:\n' } }).block, false);
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: '/r/content/videos/V11-x.md', new_string: 'status: approved' } }).block, true);
});

test('v2: normal work is allowed', () => {
  for (const c of ['npm run validate', 'npm test', 'npm run queue', 'npm run approvals:sync', 'python3 media/pipeline/render.py V01',
    'curl -sL https://meyraapp.com/tr', 'git status', 'git add -A', 'cat .env.example', 'ls content/videos 2>&1 | head', 'cat scripts/owner/decide.mjs'])
    assert.equal(bash(c).block, false, c);
});

test('splitCommands handles operators and quotes', () => {
  assert.deepEqual(splitCommands('a && b | c; "d;e" f'), ['a', 'b', 'c', '"d;e" f']);
});
