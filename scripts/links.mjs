#!/usr/bin/env node
// Generates tracking/links.csv: tracked website, Play and App Store links per placement.
// Apple provider token is read from env MEYRA_APPLE_PT (from .env, never committed). Missing → PT_REQUIRED placeholder.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { splitFrontmatter } from './lib/content.mjs';
import { buildPlacements, toCsv } from './lib/links.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
// Minimal .env loader (only MEYRA_APPLE_PT); the value is not printed.
let pt = process.env.MEYRA_APPLE_PT;
const envPath = join(ROOT, '.env');
if (!pt && existsSync(envPath)) {
  const m = /^MEYRA_APPLE_PT=(.+)$/m.exec(readFileSync(envPath, 'utf8'));
  if (m) pt = m[1].trim();
}
const dir = join(ROOT, 'content/videos');
const videos = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
  .map(f => splitFrontmatter(readFileSync(join(dir, f), 'utf8')).fm).filter(Boolean);
const rows = buildPlacements(videos, pt);
writeFileSync(join(ROOT, 'tracking/links.csv'), toCsv(rows));
console.log(`Wrote tracking/links.csv (${rows.length} placements).${pt ? '' : ' ⚠ MEYRA_APPLE_PT not set: App Store links contain PT_REQUIRED.'}`);
