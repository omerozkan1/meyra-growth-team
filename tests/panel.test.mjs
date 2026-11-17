import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { generateOwnerKeys, writePending, verifyApproval } from '../scripts/lib/approvals.mjs';
import { createPanel } from '../scripts/panel/server.mjs';
import { splitFrontmatter, contentHash } from '../scripts/lib/content.mjs';

const md = readFileSync(new URL('./approvals.test.mjs', import.meta.url), 'utf8').match(/const MD = \(qc = '([^']+)'\) => `([\s\S]*?)`;/);
const MD = md[2].replace('${qc}', md[1]);

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'meyra-panel-'));
  const keys = mkdtempSync(join(tmpdir(), 'meyra-pkeys-'));
  for (const d of ['config', 'content/videos', 'media/rendered', 'reports/daily']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'config/channels.md'), '```approvers\nÖmer\n```\n');
  writeFileSync(join(root, 'content/videos/V99-test.md'), MD);
  const video = Buffer.from('0123456789'.repeat(100));
  writeFileSync(join(root, 'media/rendered/V99.mp4'), video);
  writeFileSync(join(root, 'media/rendered/V99.render.json'), JSON.stringify({ file: 'media/rendered/V99.mp4', sha256: createHash('sha256').update(video).digest('hex'), kind: 'animatic', missing_assets: [{ segment: 1, need: 'screen_recording', description: 'x' }], source_md_hash: contentHash(splitFrontmatter(MD).body) }));
  writeFileSync(join(root, 'reports/daily/2026-11-14.json'), JSON.stringify({ date: '2026-11-14', status: 'ok', steps: [] }));
  writeFileSync(join(root, 'reports/daily/2026-11-14.md'), '# Rapor');
  generateOwnerKeys(root, keys, { name: 'Ömer' });
  writePending(root, 'V99');
  return { root, keys, token: readFileSync(join(keys, 'panel-token'), 'utf8').trim() };
}

test('panel: auth, state, media range, CSRF, signed approve via shared library', async () => {
  const f = fixture();
  const server = createPanel({ root: f.root, keys: f.keys });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/state`)).status, 401);
    assert.equal((await fetch(`${base}/login?token=wrong`, { redirect: 'manual' })).status, 401);
    const login = await fetch(`${base}/login?token=${f.token}`, { redirect: 'manual' });
    assert.equal(login.status, 302);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const H = { cookie };

    const page = await (await fetch(`${base}/`, { headers: H })).text();
    assert.match(page, /Onay bekleyenler/);
    const st = await (await fetch(`${base}/api/state`, { headers: H })).json();
    assert.equal(st.pending.length, 1);
    assert.equal(st.pending[0].captions.instagram.includes('Kıble'), true);
    assert.equal(st.runs[0].date, '2026-11-14');

    const part = await fetch(`${base}/media/V99.mp4`, { headers: { ...H, range: 'bytes=0-9' } });
    assert.equal(part.status, 206);
    assert.equal((await part.text()).length, 10);
    assert.equal((await fetch(`${base}/media/..%2F..%2Fconfig%2Fchannels.md`, { headers: H })).status, 404);
    assert.equal((await (await fetch(`${base}/api/report?date=2026-11-14`, { headers: H })).text()), '# Rapor');

    const body = JSON.stringify({ id: 'V99', decision: 'approve' });
    assert.equal((await fetch(`${base}/api/decision`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body })).status, 403, 'CSRF header required');
    const ok = await fetch(`${base}/api/decision`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', 'x-meyra-csrf': f.token }, body });
    const j = await ok.json();
    assert.equal(j.ok, true, j.error);
    assert.equal(verifyApproval(f.root, 'V99').ok, true, 'panel approval must be a valid signed approval');
    assert.equal(j.video_kind, 'animatic');
  } finally { server.close(); }
});
