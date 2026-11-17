#!/usr/bin/env node
// Meyra local control panel. Binds to 127.0.0.1 only. Owner-only via a token stored in ~/.meyra/panel-token.
// Approve/Reject use the same signed approval library as the terminal (scripts/lib/approvals.mjs).
// Usage: npm run panel  (prints/opens http://127.0.0.1:4317/login?token=...)
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { approve, reject, loadPrivateKey, keyDir, listDir, dirs, verifyApproval, loadPublicKey } from '../lib/approvals.mjs';

const DEFAULT_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const PAGE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookie = (req, name) => (req.headers.cookie || '').split(/;\s*/).map(s => s.split('=')).find(([k]) => k === name)?.[1];
const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const readBody = req => new Promise((ok, fail) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e5) req.destroy(); }); req.on('end', () => ok(s)); req.on('error', fail); });

function state(root) {
  const d = dirs(root);
  const daily = join(root, 'reports/daily');
  const runs = existsSync(daily) ? readdirSync(daily).filter(f => /^\d{4}-\d{2}-\d{2}(-test)?\.json$/.test(f)).sort().reverse()
    .map(f => { try { return JSON.parse(readFileSync(join(daily, f), 'utf8')); } catch { return { date: f.slice(0, 10), status: 'unreadable' }; } }) : [];
  const reports = existsSync(daily) ? readdirSync(daily).filter(f => /^\d{4}-\d{2}-\d{2}(-test)?\.md$/.test(f)).sort().reverse().map(f => f.replace(/\.md$/, '')) : [];
  const pub = loadPublicKey(root);
  const approved = listDir(d.approved).map(r => ({ ...r, signature: undefined, valid: verifyApproval(root, r.id, pub).ok }));
  return { keyReady: !!pub, runs, reports, pending: listDir(d.pending), approved, rejected: listDir(d.rejected).map(r => ({ ...r, signature: undefined })) };
}

export function createPanel({ root = DEFAULT_ROOT, keys = keyDir() } = {}) {
  const tokenPath = join(keys, 'panel-token');
  const token = existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8').trim() : null;
  const owner = existsSync(join(keys, 'owner.json')) ? JSON.parse(readFileSync(join(keys, 'owner.json'), 'utf8')).name : null;

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (!token) return send(res, 503, 'Owner setup missing. Run "npm run owner:setup" in your terminal.', 'text/plain; charset=utf-8');
      if (url.pathname === '/login') {
        if (!safeEq(url.searchParams.get('token') || '', token)) return send(res, 401, 'invalid token', 'text/plain');
        res.writeHead(302, { 'Set-Cookie': `meyra_panel=${token}; HttpOnly; SameSite=Strict; Path=/`, Location: '/' });
        return res.end();
      }
      if (!safeEq(cookie(req, 'meyra_panel') || '', token)) return send(res, 401, 'Unauthorized. Open the login link printed by "npm run panel".', 'text/plain; charset=utf-8');

      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, PAGE.replace('__CSRF__', token).replace('__OWNER__', owner || ''), 'text/html; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, state(root));
      if (req.method === 'GET' && url.pathname === '/api/report') {
        const date = url.searchParams.get('date') || '';
        if (!/^\d{4}-\d{2}-\d{2}(-test)?$/.test(date)) return send(res, 400, { error: 'bad date' });
        const p = join(root, 'reports/daily', `${date}.md`);
        return existsSync(p) ? send(res, 200, readFileSync(p, 'utf8'), 'text/plain; charset=utf-8') : send(res, 404, 'not found', 'text/plain');
      }
      if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
        const rel = normalize(decodeURIComponent(url.pathname.slice('/media/'.length)));
        if (rel.includes('..') || !/^V\d+\.(mp4|srt)$/.test(rel)) return send(res, 404, 'not found', 'text/plain');
        const p = join(root, 'media/rendered', rel);
        if (!existsSync(p)) return send(res, 404, 'not found', 'text/plain');
        const size = statSync(p).size;
        const type = rel.endsWith('.mp4') ? 'video/mp4' : 'text/plain; charset=utf-8';
        const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        if (m) {
          const start = m[1] ? Number(m[1]) : 0, end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
          res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
          return createReadStream(p, { start, end }).pipe(res);
        }
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
        return createReadStream(p).pipe(res);
      }
      if (req.method === 'POST' && url.pathname === '/api/decision') {
        if (!safeEq(req.headers['x-meyra-csrf'] || '', token)) return send(res, 403, { error: 'csrf' });
        if (req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin)) return send(res, 403, { error: 'origin' });
        const { id, decision, reason } = JSON.parse(await readBody(req) || '{}');
        if (!/^V\d+$/.test(id || '') || !['approve', 'reject'].includes(decision)) return send(res, 400, { error: 'bad request' });
        if (!owner) return send(res, 503, { error: 'owner setup missing' });
        try {
          const rec = (decision === 'approve' ? approve : reject)(root, id, { by: owner, reason: reason || null, privateKey: loadPrivateKey(keys) });
          return send(res, 200, { ok: true, id, decision: rec.decision, at: rec.at, video_kind: rec.video_kind });
        } catch (e) { return send(res, 409, { ok: false, error: e.message }); }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) { return send(res, 500, { error: e.message }); }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.MEYRA_PANEL_PORT || 4317);
  const server = createPanel();
  server.listen(port, '127.0.0.1', () => {
    const tp = join(keyDir(), 'panel-token');
    if (!existsSync(tp)) { console.log('Owner setup missing. Run: npm run owner:setup'); return; }
    const link = `http://127.0.0.1:${port}/login?token=${readFileSync(tp, 'utf8').trim()}`;
    console.log(`Meyra panel: ${link}\n(local only; Ctrl+C to stop)`);
    if (process.argv.includes('--open')) execFile('open', [link]);
  });
}
