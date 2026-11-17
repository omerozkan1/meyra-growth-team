import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideo, splitFrontmatter, setFrontmatterField, contentHash, scanSecrets, parseApprovers, parseYamlSubset } from '../scripts/lib/content.mjs';

const ctx = { approvers: ['Ömer'] };
const fm = (extra = '') => `---
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
${extra}---
`;
const body = (script = 'Kıbleyi bul.', extraCaption = '') => `
## Hook
Otel odasında kıble nerede?
## Script
${script}
## Visual Direction
Ekran kaydı.
## Captions
### Instagram
Kıble bulmak kolay. #kıble ${extraCaption}
### TikTok
Kıble. #kıble
### YouTube Shorts
Başlık: Otel odasında kıble nasıl bulunur?
Açıklama: test
## CTA
Link profilde.
## Claims Check
- Banned: "sıfır sapma" not used
`;

test('valid draft passes', () => {
  const r = validateVideo('V99-test.md', fm() + body(), ctx);
  assert.deepEqual(r.errors, []);
});

test('parses inline lists and empties', () => {
  const y = parseYamlSubset('a: [x, "y z"]\nb:\nc: 3\nd: true');
  assert.deepEqual(y, { a: ['x', 'y z'], b: '', c: 3, d: true });
});

test('filename must match id', () => {
  const r = validateVideo('V01-x.md', fm() + body(), ctx);
  assert.ok(r.errors.some(e => e.includes('filename')));
});

test('banned claims are caught, but listing them in Claims Check is allowed', () => {
  const r = validateVideo('V99-t.md', fm() + body('Namaz vakitleri sıfır sapma ile!'), ctx);
  assert.ok(r.errors.some(e => e.includes('sıfır sapma')));
  assert.ok(!r.errors.some(e => e.includes('line 2')), 'claims-check banned list line must not trigger');
});

test('Diyanet onaylı and tamamen ücretsiz are caught (Turkish case-folding)', () => {
  const r = validateVideo('V99-t.md', fm() + body('DİYANET ONAYLI ve tamamen ücretsiz'), ctx);
  assert.equal(r.errors.filter(e => e.includes('banned claim')).length, 2);
});

test('reklamsız only with Premium', () => {
  assert.ok(validateVideo('V99-t.md', fm() + body('Uygulama reklamsız'), ctx).errors.some(e => e.includes('reklamsız')));
  assert.ok(!validateVideo('V99-t.md', fm() + body('Premium ile reklamsız'), ctx).errors.some(e => e.includes('reklamsız')));
});

test('verse reference without sources fails', () => {
  const r = validateVideo('V99-t.md', fm() + body('Ra\'d Suresi 28. ayet: kalpler huzur bulur.'), ctx);
  assert.ok(r.errors.some(e => e.includes('sources')));
});

test('approval fields on a draft fail (agents cannot pre-approve)', () => {
  const t = fm().replace('approved_by:', 'approved_by: Ömer') + body();
  assert.ok(validateVideo('V99-t.md', t, ctx).errors.some(e => e.includes('approval fields')));
});

test('approved item: valid hash passes, edited content fails', () => {
  let t = fm() + body();
  const { body: b } = splitFrontmatter(t);
  t = setFrontmatterField(t, 'status', 'approved');
  t = setFrontmatterField(t, 'approved_by', 'Ömer');
  t = setFrontmatterField(t, 'approved_at', '2026-11-15T10:00:00Z');
  t = setFrontmatterField(t, 'approved_hash', contentHash(b));
  assert.deepEqual(validateVideo('V99-t.md', t, ctx).errors, []);
  const edited = t.replace('Kıbleyi bul.', 'Kıbleyi hemen bul.');
  assert.ok(validateVideo('V99-t.md', edited, ctx).errors.some(e => e.includes('changed after approval')));
});

test('unknown approver rejected', () => {
  let t = fm() + body();
  const { body: b } = splitFrontmatter(t);
  t = setFrontmatterField(t, 'status', 'approved');
  t = setFrontmatterField(t, 'approved_by', 'Claude');
  t = setFrontmatterField(t, 'approved_at', '2026-11-15T10:00:00Z');
  t = setFrontmatterField(t, 'approved_hash', contentHash(b));
  assert.ok(validateVideo('V99-t.md', t, ctx).errors.some(e => e.includes('listed approver')));
});

test('missing YouTube title and too many hashtags', () => {
  const t = fm() + body('x', '#a #b #c #d #e').replace('Başlık: Otel odasında kıble nasıl bulunur?', '');
  const r = validateVideo('V99-t.md', t, ctx);
  assert.ok(r.errors.some(e => e.includes('Başlık')));
  assert.ok(r.warnings.some(w => w.includes('hashtags')));
});

test('secrets scan', () => {
  assert.equal(scanSecrets('key=AIza' + 'A'.repeat(35)).length, 1);
  assert.equal(scanSecrets('-----BEGIN ' + 'PRIVATE KEY-----').length, 1);
  assert.equal(scanSecrets('MEYRA_APPLE_PT=').length, 0);
});

test('approvers block parsing', () => {
  assert.deepEqual(parseApprovers('x\n```approvers\nÖmer Özkan\nÖmer\n```\n'), ['Ömer Özkan', 'Ömer']);
});
