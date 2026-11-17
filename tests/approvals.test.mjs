import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { generateOwnerKeys, writePending, approve, reject, verifyApproval, canPublish, loadPrivateKey, invalidateIfStale } from '../scripts/lib/approvals.mjs';
import { splitFrontmatter, contentHash } from '../scripts/lib/content.mjs';

const MD = (qc = 'QC: PASS (2026-11-14)') => `---
id: V99
title: Test video
pillar: P2
status: draft
platforms: [instagram, tiktok, youtube]
duration_s: 20
language: tr
segment: S1
cta_type: soft
publish_target: 2026-11-20
sources: []
approved_by:
approved_at:
approved_hash:
published_urls: []
---

## Hook
Otel odasında kıble nerede?
## Script
| Zaman | Seslendirme | Görüntü |
|---|---|---|
| 0–2 sn | Kıbleyi bul. | Ekran kaydı |
## Visual Direction
Ekran kaydı.
## Captions
### Instagram
Kıble bulmak kolay. #kıble
### TikTok
Kıble. #kıble
### YouTube Shorts
Başlık: Otel odasında kıble nasıl bulunur?
## CTA
Link profilde.
## Claims Check
- Features: qibla. ${qc}
`;

function fixture({ kind = 'final', qc } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'meyra-appr-'));
  const keys = mkdtempSync(join(tmpdir(), 'meyra-keys-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  mkdirSync(join(root, 'content/videos'), { recursive: true });
  mkdirSync(join(root, 'media/rendered'), { recursive: true });
  writeFileSync(join(root, 'config/channels.md'), '```approvers\nÖmer\n```\n');
  const md = MD(qc);
  writeFileSync(join(root, 'content/videos/V99-test.md'), md);
  const video = Buffer.from('fake-mp4-bytes');
  writeFileSync(join(root, 'media/rendered/V99.mp4'), video);
  writeFileSync(join(root, 'media/rendered/V99.render.json'), JSON.stringify({
    file: 'media/rendered/V99.mp4', sha256: createHash('sha256').update(video).digest('hex'), kind,
    missing_assets: kind === 'final' ? [] : [{ segment: 1, need: 'screen_recording' }], source_md_hash: contentHash(splitFrontmatter(md).body),
  }));
  generateOwnerKeys(root, keys, { name: 'Ömer' });
  return { root, keys, privateKey: loadPrivateKey(keys) };
}

test('pipeline packages into pending; QC verdict required', () => {
  const ok = fixture();
  assert.equal(writePending(ok.root, 'V99').qc.status, 'ready');
  const noqc = fixture({ qc: '' });
  const pkg = writePending(noqc.root, 'V99');
  assert.equal(pkg.qc.status, 'blocked');
  assert.throws(() => approve(noqc.root, 'V99', { by: 'Ömer', privateKey: noqc.privateKey }), /blocked/);
});

test('signed approval verifies; unknown approver and unsigned records fail', () => {
  const f = fixture();
  writePending(f.root, 'V99');
  assert.throws(() => approve(f.root, 'V99', { by: 'Claude', privateKey: f.privateKey }), /not a listed approver/);
  approve(f.root, 'V99', { by: 'Ömer', privateKey: f.privateKey });
  assert.equal(verifyApproval(f.root, 'V99').ok, true);
  // forge: edit the signed record
  const p = join(f.root, 'approvals/approved/V99.json');
  const rec = JSON.parse(readFileSync(p, 'utf8'));
  writeFileSync(p, JSON.stringify({ ...rec, by: 'Claude' }));
  assert.match(verifyApproval(f.root, 'V99').reasons.join(), /signature invalid/);
});

test('a key that is not the owner key cannot approve', () => {
  const f = fixture();
  const other = fixture();
  writePending(f.root, 'V99');
  approve(f.root, 'V99', { by: 'Ömer', privateKey: other.privateKey }); // signed with the wrong key
  assert.equal(verifyApproval(f.root, 'V99').ok, false);
});

test('changing caption or video after approval invalidates it, and sync sends it back to review', () => {
  const f = fixture();
  writePending(f.root, 'V99');
  approve(f.root, 'V99', { by: 'Ömer', privateKey: f.privateKey });
  const mdPath = join(f.root, 'content/videos/V99-test.md');
  writeFileSync(mdPath, readFileSync(mdPath, 'utf8').replace('Kıble bulmak kolay.', 'Kıble bulmak çok kolay.'));
  assert.match(verifyApproval(f.root, 'V99').reasons.join(), /captions changed/);
  assert.equal(canPublish(f.root, 'V99').ok, false);
  invalidateIfStale(f.root, 'V99');
  assert.match(readFileSync(mdPath, 'utf8'), /status: in_review/);
  assert.equal(existsSync(join(f.root, 'approvals/approved/V99.json')), false);

  const g = fixture();
  writePending(g.root, 'V99');
  approve(g.root, 'V99', { by: 'Ömer', privateKey: g.privateKey });
  writeFileSync(join(g.root, 'media/rendered/V99.mp4'), 'other-bytes');
  assert.match(verifyApproval(g.root, 'V99').reasons.join(), /video file changed/);
});

test('cannot approve if files changed after packaging', () => {
  const f = fixture();
  writePending(f.root, 'V99');
  writeFileSync(join(f.root, 'media/rendered/V99.mp4'), 'swapped');
  assert.throws(() => approve(f.root, 'V99', { by: 'Ömer', privateKey: f.privateKey }), /changed after it was packaged/);
});

test('reject is signed and recorded', () => {
  const f = fixture();
  writePending(f.root, 'V99');
  reject(f.root, 'V99', { by: 'Ömer', reason: 'hook zayıf', privateKey: f.privateKey });
  assert.ok(existsSync(join(f.root, 'approvals/rejected/V99.json')));
  assert.match(readFileSync(join(f.root, 'content/videos/V99-test.md'), 'utf8'), /status: rejected/);
});

const publish = (root, ...args) => spawnSync('node', ['scripts/publish/publish.mjs', 'V99', ...args], { encoding: 'utf8', env: { ...process.env, MEYRA_ROOT: root, MEYRA_DRY_RUN: '' } });

test('PUBLISH GATE: unapproved → refused; draft video → refused; approved final → dry-run only', () => {
  const f = fixture();
  let r = publish(f.root, '--platform', 'instagram', '--dry-run');
  assert.equal(r.status, 3);
  assert.match(r.stderr, /PUBLISH REFUSED.*\n.*no owner approval/);

  const d = fixture({ kind: 'animatic' });
  writePending(d.root, 'V99');
  approve(d.root, 'V99', { by: 'Ömer', privateKey: d.privateKey });
  r = publish(d.root, '--platform', 'instagram', '--dry-run');
  assert.equal(r.status, 3);
  assert.match(r.stderr, /draft "animatic"/);

  writePending(f.root, 'V99');
  approve(f.root, 'V99', { by: 'Ömer', privateKey: f.privateKey });
  r = publish(f.root, '--platform', 'instagram');
  assert.equal(r.status, 4, 'real publishing is disabled even when approved');
  r = publish(f.root, '--platform', 'instagram', '--dry-run');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY-RUN ok.*nothing sent/);
});
