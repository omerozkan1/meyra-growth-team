#!/usr/bin/env node
// Prints a KPI markdown table from data/metrics/*.csv (manual exports until APIs are connected).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, weeklyKpis, renderMarkdown } from './lib/metrics.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const dataDir = process.argv[2] || join(ROOT, 'data/metrics');
const read = f => existsSync(join(dataDir, f)) ? parseCsv(readFileSync(join(dataDir, f), 'utf8')) : [];
process.stdout.write(renderMarkdown(weeklyKpis(read('social_weekly.csv'), read('funnel_weekly.csv'))));
