#!/usr/bin/env node
// Daily autonomous run (DRY-RUN: never publishes). Called by scripts/daily/run-daily.sh (launchd at 09:00 Europe/Istanbul).
// Steps: preflight → Growth CEO (headless Claude, delegates to specialists) → render → validate → approvals sync → links → report.
// Usage: node scripts/daily/orchestrate.mjs [--test] [--trigger manual|launchd|catch-up] [--skip-ceo]
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { syncApprovals } from '../approvals-sync.mjs';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const args = process.argv.slice(2);
const TEST = args.includes('--test');
const ti = args.indexOf('--trigger');
const trigger = ti > -1 && args[ti + 1] ? args[ti + 1] : 'manual';
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const tag = TEST ? `${date}-test` : date;
const DAILY = join(ROOT, 'reports/daily');
mkdirSync(join(DAILY, 'logs'), { recursive: true });
mkdirSync(join(ROOT, 'media/work'), { recursive: true });

const run = { date: tag, mode: TEST ? 'test' : 'daily', dry_run: true, trigger, status: 'running', started_at: new Date().toISOString(), steps: [], errors: [] };
const save = () => writeFileSync(join(DAILY, `${tag}.json`), JSON.stringify(run, null, 2));
save();

function sh(cmd, argv, { timeoutMs = 10 * 60_000, env = {} } = {}) {
  return new Promise(resolve => {
    const p = spawn(cmd, argv, { cwd: ROOT, env: { ...process.env, MEYRA_DRY_RUN: '1', ...env } });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGTERM'); err += `\n[timeout after ${timeoutMs / 1000}s]`; }, timeoutMs);
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); resolve({ code: 127, out, err: String(e) }); });
    p.on('close', code => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}
async function step(name, fn) {
  const t0 = Date.now();
  const s = { name, status: 'ok', detail: '' };
  run.steps.push(s); save();
  try { Object.assign(s, await fn()); } catch (e) { s.status = 'error'; s.detail = e.message.slice(0, 400); run.errors.push(`${name}: ${e.message.slice(0, 400)}`); }
  s.duration_s = Math.round((Date.now() - t0) / 100) / 10;
  save();
  return s;
}
const snapshot = () => Object.fromEntries(readdirSync(join(ROOT, 'content/videos')).filter(f => f.endsWith('.md')).map(f => [f, statSync(join(ROOT, 'content/videos', f)).mtimeMs]));

// ---------------------------------------------------------------- steps
await step('Ön kontrol (testler + doğrulama)', async () => {
  const t = await sh('node', ['--test', ...readdirSync(join(ROOT, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => `tests/${f}`)]);
  const pass = /ℹ pass (\d+)/.exec(t.out)?.[1], fail = /ℹ fail (\d+)/.exec(t.out)?.[1];
  const v = await sh('node', ['scripts/validate.mjs']);
  const verr = /(\d+) error\(s\)/.exec(v.out)?.[1];
  const bad = t.code !== 0 || v.code !== 0;
  return { status: bad ? 'warn' : 'ok', detail: `tests ${pass}/${Number(pass) + Number(fail)} pass · validate ${verr} error(s)` };
});

const before = snapshot();
let ceo = null;
if (args.includes('--skip-ceo')) run.steps.push({ name: 'Growth CEO', status: 'skipped', detail: '--skip-ceo' });
else await step('Growth CEO + uzman ajanlar (Claude, headless)', async () => {
  const promptFile = join(ROOT, 'scripts/daily', TEST ? 'ceo-prompt-test.md' : 'ceo-prompt.md');
  const prompt = readFileSync(promptFile, 'utf8').replaceAll('{{DATE}}', date).replaceAll('{{TAG}}', tag);
  const allowed = [
    'Read', 'Glob', 'Grep', 'Agent', 'TodoWrite',
    'Edit(./content/**)', 'Write(./content/**)', 'Edit(./reports/**)', 'Write(./reports/**)',
    'Bash(npm run validate)', 'Bash(npm run queue)', 'Bash(npm test)', 'Bash(ls:*)',
    'WebFetch(domain:kuran.diyanet.gov.tr)', 'WebFetch(domain:dinisorular.diyanet.gov.tr)', 'WebFetch(domain:meyraapp.com)',
  ];
  const disallowed = ['Bash(git push:*)', 'Bash(curl:*)', 'Bash(wget:*)', 'WebSearch'];
  const argv = ['-p', '--agent', 'growth-ceo', '--output-format', 'json', '--max-turns', TEST ? '40' : '80',
    '--allowedTools', ...allowed, '--disallowedTools', ...disallowed];
  if (process.env.MEYRA_CEO_MODEL) argv.push('--model', process.env.MEYRA_CEO_MODEL);
  argv.push('--', prompt);
  const r = await sh(process.env.MEYRA_CLAUDE_BIN || 'claude', argv, { timeoutMs: (TEST ? 25 : 50) * 60_000 });
  writeFileSync(join(ROOT, 'media/work', `ceo-${tag}.json`), r.out || '');
  writeFileSync(join(DAILY, 'logs', `${tag}-ceo.stderr.log`), r.err || '');
  try { ceo = JSON.parse(r.out); } catch { ceo = null; }
  if (!ceo) return { status: 'error', detail: `claude exit ${r.code}; no JSON output. ${r.err.slice(-300)}` };
  run.ceo_summary = String(ceo.result || '').slice(0, 4000);
  run.ceo = { exit: r.code, is_error: ceo.is_error, turns: ceo.num_turns, cost_usd_equivalent: ceo.total_cost_usd, session_id: ceo.session_id, duration_s: Math.round((ceo.duration_ms || 0) / 1000) };
  const denials = (ceo.permission_denials || []).map(d => `${d.tool_name}${d.tool_input?.command ? `: ${d.tool_input.command}` : d.tool_input?.file_path ? `: ${d.tool_input.file_path}` : ''}`);
  run.ceo.permission_denials = denials;
  return { status: ceo.is_error || r.code !== 0 ? 'error' : 'ok', detail: `${ceo.num_turns} turns · ${denials.length} blocked tool call(s)` };
});

const after = snapshot();
const changed = Object.keys(after).filter(f => before[f] !== after[f]);
run.content_changed = changed;

await step('Video render (Python + FFmpeg)', async () => {
  const r = await sh('python3', ['media/pipeline/render.py', '--all'], { timeoutMs: 30 * 60_000 });
  const lines = r.out.trim().split('\n').filter(l => /^V\d+:/.test(l));
  run.renders = lines;
  const rendered = lines.filter(l => / rendered /.test(l)).length, failed = lines.filter(l => /FAILED/.test(l)).length;
  if (failed) run.errors.push(...lines.filter(l => /FAILED/.test(l)));
  return { status: failed ? 'warn' : 'ok', detail: `${rendered} rendered · ${lines.length - rendered - failed} up to date · ${failed} failed` };
});

await step('Kalite kontrol (validator)', async () => {
  const v = await sh('node', ['scripts/validate.mjs']);
  run.validate = v.out.split('\n').filter(l => /^[✖⚠]/.test(l)).slice(0, 50);
  const n = Number(/(\d+) error\(s\)/.exec(v.out)?.[1] || 0);
  return { status: n ? 'warn' : 'ok', detail: `${n} error(s), ${/(\d+) warning/.exec(v.out)?.[1] || 0} warning(s)` };
});

await step('Onay kuyruğu (approvals/pending)', async () => {
  const out = syncApprovals(ROOT);
  run.approvals = out;
  return { detail: `${out.packaged.length} ready · ${out.blocked.length} blocked · ${out.unchanged.length} unchanged · ${out.invalidated.length} invalidated` };
});

await step('Takip linkleri', async () => {
  const r = await sh('node', ['scripts/links.mjs']);
  return { status: r.code ? 'warn' : 'ok', detail: r.out.trim().slice(0, 200) };
});

// ---------------------------------------------------------------- report
const pending = readdirSync(join(ROOT, 'approvals/pending')).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(ROOT, 'approvals/pending', f), 'utf8')));
const missing = pending.flatMap(p => (p.video?.missing_assets || []).map(m => ({ id: p.id, ...m })));
run.finished_at = new Date().toISOString();
run.status = run.steps.some(s => s.status === 'error') ? (run.steps.filter(s => s.status === 'ok').length > 2 ? 'partial' : 'failed') : 'ok';
save();

const L = [];
L.push(`# Günlük rapor · ${tag}${TEST ? ' (TEST)' : ''}`, '');
L.push(`**Durum:** ${run.status} · **Mod:** DRY-RUN (hiçbir şey yayınlanmadı) · **Tetikleyen:** ${trigger}`);
L.push(`Başlangıç ${run.started_at} · Bitiş ${run.finished_at}`, '');
L.push('## Adımlar', '| Adım | Durum | Detay | Süre |', '|---|---|---|---|');
for (const s of run.steps) L.push(`| ${s.name} | ${s.status} | ${String(s.detail || '').replace(/\|/g, '/')} | ${s.duration_s ?? '-'} sn |`);
L.push('', '## Growth CEO özeti', run.ceo_summary || '_CEO çalışmadı veya çıktı vermedi._');
if (run.ceo?.permission_denials?.length) L.push('', '**Engellenen araç çağrıları:**', ...run.ceo.permission_denials.map(d => `- ${d}`));
L.push('', `## Değişen içerik dosyaları (${changed.length})`, ...(changed.length ? changed.map(f => `- content/videos/${f}`) : ['- yok']));
L.push('', `## Onay bekleyenler (${pending.length})`);
for (const p of pending) L.push(`- **${p.id}** ${p.title}: ${p.qc.status === 'ready' ? 'HAZIR (onaylanabilir)' : 'ENGELLİ: ' + p.qc.reasons.slice(0, 3).join('; ')} · video: ${p.video?.kind || '-'}`);
L.push('', `## Eksik kaynaklar (${missing.length}): uydurulmadı, sizden bekleniyor`);
const byId = {};
for (const m of missing) (byId[m.id] ||= []).push(m);
for (const [id, ms] of Object.entries(byId)) L.push(`- **${id}**: ${ms.map(m => `bölüm ${m.segment} ${m.need === 'screen_recording' ? 'ekran kaydı' : 'görüntü'}`).join(', ')} → \`assets/library/${id}/segNN.mp4\``);
L.push('', '## Sizden beklenenler',
  '- Paneli açın: `npm run panel -- --open` → Onay bekleyenler.',
  '- Taslak videolar (TASLAK etiketli) yayınlanamaz: eksik ekran kayıtlarını ve kendi seslendirmenizi `assets/library/<ID>/` altına koyun; bir sonraki çalışma final render üretir.');
if (run.errors.length) L.push('', '## Hatalar', ...run.errors.map(e => `- ${e}`));
writeFileSync(join(DAILY, `${tag}.md`), L.join('\n') + '\n');
console.log(`daily run ${tag}: ${run.status} → reports/daily/${tag}.md`);
process.exit(run.status === 'failed' ? 1 : 0);
