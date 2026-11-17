// Approval system v2: pending packages, owner-signed decisions (Ed25519), verification and publish gate.
//
// approvals/pending/V##.json   package waiting for the owner (written by the pipeline; harmless if forged)
// approvals/approved/V##.json  owner decision, signed with the owner's private key (~/.meyra, never in the repo)
// approvals/rejected/V##.json  owner rejection, signed
// config/approver_ed25519.pub.pem  public key used by everyone to verify signatures
//
// An approval is valid only if the signature verifies AND the current script/captions, metadata and video
// still hash to the signed values. Any edit after approval invalidates it.
import { createHash, sign, verify, generateKeyPairSync, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { splitFrontmatter, setFrontmatterField, contentHash, validateVideo, parseApprovers, sections, subsections } from './content.mjs';

export const PUBKEY_REL = 'config/approver_ed25519.pub.pem';
export const keyDir = () => process.env.MEYRA_KEY_DIR || join(homedir(), '.meyra');

const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };
export const dirs = root => ({
  pending: join(root, 'approvals/pending'), approved: join(root, 'approvals/approved'),
  rejected: join(root, 'approvals/rejected'), invalidated: join(root, 'approvals/invalidated'),
});

export function findMd(root, id) {
  const d = join(root, 'content/videos');
  const f = readdirSync(d).find(x => x.startsWith(`${id}-`) && x.endsWith('.md'));
  if (!f) throw new Error(`no content file for ${id}`);
  return join(d, f);
}

export function extractCaptions(body) {
  const sub = subsections(sections(body).Captions || '');
  return { instagram: (sub.Instagram || '').trim(), tiktok: (sub.TikTok || '').trim(), youtube: (sub['YouTube Shorts'] || '').trim() };
}

/** Current hashes of everything an approval covers. */
export function currentState(root, id) {
  const mdPath = findMd(root, id);
  const text = readFileSync(mdPath, 'utf8');
  const { fm, body } = splitFrontmatter(text);
  const meta = { title: fm.title, pillar: fm.pillar, platforms: fm.platforms, publish_target: String(fm.publish_target) };
  const manifestPath = join(root, 'media/rendered', `${id}.render.json`);
  let video = null;
  if (existsSync(manifestPath)) {
    const m = readJson(manifestPath);
    const file = join(root, m.file);
    video = {
      file: m.file, kind: m.kind, missing_assets: m.missing_assets || [], duration_s: m.duration_s,
      voice: m.voice?.type, manifest_sha256: m.sha256,
      sha256: existsSync(file) ? sha256(readFileSync(file)) : null,
      rendered_from_hash: m.source_md_hash,
    };
  }
  return {
    id, mdPath, fm, body, text,
    content_hash: contentHash(body),
    meta_hash: sha256(JSON.stringify(meta)).slice(0, 16),
    captions: extractCaptions(body),
    video,
  };
}

function qcStatus(root, id, st) {
  const approvers = parseApprovers(readFileSync(join(root, 'config/channels.md'), 'utf8'));
  const file = st.mdPath.split('/').pop();
  // validate as if in_review (pending packages are pre-approval)
  const asReview = setFrontmatterField(st.text, 'status', st.fm.status === 'draft' ? 'in_review' : st.fm.status);
  const { errors, warnings } = validateVideo(file, asReview, { approvers });
  const claims = sections(st.body)['Claims Check'] || '';
  const verdict = /QC:\s*PASS/.test(claims) ? 'PASS' : /QC:\s*BLOCKED/.test(claims) ? 'BLOCKED' : 'MISSING';
  const reasons = [...errors];
  if (verdict !== 'PASS') reasons.push(`quality-controller verdict is ${verdict} (needs "QC: PASS" in Claims Check)`);
  if (!st.video) reasons.push('no rendered video yet');
  else if (st.video.sha256 !== st.video.manifest_sha256) reasons.push('video file differs from its render manifest');
  else if (st.video.rendered_from_hash !== st.content_hash) reasons.push('video was rendered from an older script; re-render');
  return { status: reasons.length ? 'blocked' : 'ready', reasons, warnings, verdict };
}

/** Build/refresh approvals/pending/ID.json from current files. Returns the package or null if already decided for these exact hashes. */
export function writePending(root, id, { now = new Date() } = {}) {
  const d = dirs(root);
  const st = currentState(root, id);
  for (const kind of ['approved', 'rejected']) {
    const p = join(d[kind], `${id}.json`);
    if (existsSync(p)) {
      const r = readJson(p);
      if (r.content_hash === st.content_hash && r.meta_hash === st.meta_hash && (r.video_sha256 || null) === (st.video?.sha256 || null)) return null;
    }
  }
  const qc = qcStatus(root, id, st);
  const pkg = {
    id, title: st.fm.title, pillar: st.fm.pillar, platforms: st.fm.platforms, publish_target: String(st.fm.publish_target),
    packaged_at: now.toISOString(), md: st.mdPath.slice(root.length + 1),
    content_hash: st.content_hash, meta_hash: st.meta_hash, captions: st.captions,
    video: st.video, video_sha256: st.video?.sha256 || null, qc,
  };
  writeJson(join(d.pending, `${id}.json`), pkg);
  return pkg;
}

const SIGNED_FIELDS = ['id', 'decision', 'by', 'at', 'content_hash', 'meta_hash', 'video_sha256', 'video_kind', 'reason'];
export const canonical = rec => JSON.stringify(SIGNED_FIELDS.map(k => [k, rec[k] ?? null]));

export function loadPrivateKey(dir = keyDir()) {
  const p = join(dir, 'approver_ed25519.pem');
  if (!existsSync(p)) throw new Error(`owner key not found at ${p}. Run "npm run owner:setup" in your own terminal first.`);
  return createPrivateKey(readFileSync(p));
}
export function loadPublicKey(root) {
  const p = join(root, PUBKEY_REL);
  if (!existsSync(p)) return null;
  return createPublicKey(readFileSync(p));
}

export function generateOwnerKeys(root, dir = keyDir(), { name }) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const priv = join(dir, 'approver_ed25519.pem');
  if (existsSync(priv)) throw new Error(`a key already exists at ${priv}; delete it deliberately to rotate`);
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  chmodSync(priv, 0o600);
  writeFileSync(join(dir, 'owner.json'), JSON.stringify({ name }, null, 2), { mode: 0o600 });
  writeFileSync(join(dir, 'panel-token'), sha256(String(Math.random()) + Date.now() + priv).slice(0, 40), { mode: 0o600 });
  writeFileSync(join(root, PUBKEY_REL), publicKey.export({ type: 'spki', format: 'pem' }));
}

function decide(root, id, decision, { by, reason = null, privateKey, now = new Date() }) {
  const approvers = parseApprovers(readFileSync(join(root, 'config/channels.md'), 'utf8'));
  if (!approvers.includes(by)) throw new Error(`"${by}" is not a listed approver (config/channels.md)`);
  const d = dirs(root);
  const pendingPath = join(d.pending, `${id}.json`);
  if (!existsSync(pendingPath)) throw new Error(`${id} is not in approvals/pending`);
  const pkg = readJson(pendingPath);
  const st = currentState(root, id);
  if (pkg.content_hash !== st.content_hash || pkg.meta_hash !== st.meta_hash || (pkg.video_sha256 || null) !== (st.video?.sha256 || null)) {
    throw new Error(`${id} changed after it was packaged. Re-run the pipeline (npm run approvals:sync) and review again`);
  }
  if (decision === 'approved') {
    const qc = qcStatus(root, id, st);
    if (qc.status !== 'ready') throw new Error(`${id} is blocked: ${qc.reasons.join('; ')}`);
  }
  const rec = {
    id, decision, by, at: now.toISOString(), content_hash: st.content_hash, meta_hash: st.meta_hash,
    video_sha256: st.video?.sha256 || null, video_kind: st.video?.kind || null, reason,
    video_file: st.video?.file || null, captions: st.captions,
  };
  rec.signature = sign(null, Buffer.from(canonical(rec)), privateKey).toString('base64');
  writeJson(join(d[decision === 'approved' ? 'approved' : 'rejected'], `${id}.json`), rec);
  rmSync(pendingPath);
  let text = readFileSync(st.mdPath, 'utf8');
  if (decision === 'approved') {
    text = setFrontmatterField(text, 'status', 'approved');
    text = setFrontmatterField(text, 'approved_by', by);
    text = setFrontmatterField(text, 'approved_at', rec.at);
    text = setFrontmatterField(text, 'approved_hash', st.content_hash);
  } else {
    text = setFrontmatterField(text, 'status', 'rejected');
    text = setFrontmatterField(text, 'review_notes', JSON.stringify(reason || ''));
  }
  writeFileSync(st.mdPath, text);
  return rec;
}
export const approve = (root, id, opts) => decide(root, id, 'approved', opts);
export const reject = (root, id, opts) => decide(root, id, 'rejected', opts);

/** Is there a valid, untampered owner approval for the current files? */
export function verifyApproval(root, id, publicKey = loadPublicKey(root)) {
  const reasons = [];
  const p = join(dirs(root).approved, `${id}.json`);
  if (!publicKey) return { ok: false, reasons: ['owner public key missing (run npm run owner:setup)'] };
  if (!existsSync(p)) return { ok: false, reasons: ['no owner approval record'] };
  const rec = readJson(p);
  let sigOk = false;
  try { sigOk = rec.decision === 'approved' && verify(null, Buffer.from(canonical(rec)), publicKey, Buffer.from(rec.signature || '', 'base64')); } catch { sigOk = false; }
  if (!sigOk) reasons.push('approval signature invalid (not signed by the owner key)');
  const st = currentState(root, id);
  if (rec.content_hash !== st.content_hash) reasons.push('script/captions changed after approval');
  if (rec.meta_hash !== st.meta_hash) reasons.push('title/platforms/date changed after approval');
  if ((rec.video_sha256 || null) !== (st.video?.sha256 || null)) reasons.push('video file changed after approval');
  if (!['approved', 'scheduled', 'published'].includes(st.fm.status)) reasons.push(`content status is "${st.fm.status}"`);
  return { ok: reasons.length === 0, reasons, record: rec, state: st };
}

/** Publish gate: valid approval + final (non-draft) video. */
export function canPublish(root, id, publicKey = loadPublicKey(root)) {
  const v = verifyApproval(root, id, publicKey);
  const reasons = [...v.reasons];
  const video = v.state?.video;
  if (!video) reasons.push('no rendered video');
  else {
    if (video.kind !== 'final') reasons.push(`video is a draft "${video.kind}" (missing assets or TTS draft voice)`);
    if (video.missing_assets.length) reasons.push(`${video.missing_assets.length} missing asset(s)`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** If an approval no longer matches the files, archive it and send the item back to review. */
export function invalidateIfStale(root, id, publicKey = loadPublicKey(root)) {
  const p = join(dirs(root).approved, `${id}.json`);
  if (!existsSync(p)) return null;
  const v = verifyApproval(root, id, publicKey);
  if (v.ok) return null;
  const d = dirs(root);
  mkdirSync(d.invalidated, { recursive: true });
  renameSync(p, join(d.invalidated, `${id}-${Date.now()}.json`));
  let text = readFileSync(v.state.mdPath, 'utf8');
  if (['approved', 'scheduled'].includes(v.state.fm.status)) {
    text = setFrontmatterField(text, 'status', 'in_review');
    for (const k of ['approved_by', 'approved_at', 'approved_hash']) text = setFrontmatterField(text, k, '');
    writeFileSync(v.state.mdPath, text);
  }
  return v.reasons;
}

export function listDir(dir) {
  return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => readJson(join(dir, f))) : [];
}
