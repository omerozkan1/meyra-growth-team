import { test } from 'node:test';
import assert from 'node:assert/strict';
import { websiteLink, playLink, appStoreLink, buildPlacements, toCsv } from '../scripts/lib/links.mjs';
import { parseCsv, weeklyKpis, renderMarkdown } from '../scripts/lib/metrics.mjs';

test('website link has UTMs', () => {
  const u = new URL(websiteLink({ source: 'instagram', campaign: 'bio' }));
  assert.equal(u.pathname, '/tr/download');
  assert.equal(u.searchParams.get('utm_source'), 'instagram');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
});

test('play link encodes referrer', () => {
  const u = new URL(playLink({ source: 'tiktok', campaign: 'organic_video', content: 'V03' }));
  assert.equal(u.searchParams.get('id'), 'com.omerozkan.meyra');
  const ref = new URLSearchParams(u.searchParams.get('referrer'));
  assert.equal(ref.get('utm_content'), 'V03');
});

test('app store link uses pt/ct, ct capped at 40, placeholder when no token', () => {
  const u = new URL(appStoreLink({ ct: 'x'.repeat(60) }));
  assert.equal(u.searchParams.get('ct').length, 40);
  assert.equal(u.searchParams.get('pt'), 'PT_REQUIRED');
  assert.equal(new URL(appStoreLink({ ct: 'a', providerToken: '123' })).searchParams.get('pt'), '123');
});

test('placements: 3 bio + per-platform per video', () => {
  const rows = buildPlacements([{ id: 'V01', platforms: ['instagram', 'youtube'] }]);
  assert.equal(rows.length, 5);
  assert.ok(toCsv(rows).startsWith('placement,website,play,appstore\n'));
});

test('weekly KPIs and WoW rendering', () => {
  const social = parseCsv(`week_start,platform,posts,views,saves,shares,profile_visits,link_clicks
2026-11-16,instagram,5,1000,10,5,100,10
2026-11-16,tiktok,5,3000,20,10,200,10
2026-11-23,instagram,5,2000,10,5,100,20
2026-11-23,tiktok,5,n/a,,,,`);
  const funnel = parseCsv(`week_start,ios_product_page_views,ios_downloads,android_listing_visitors,android_acquisitions,first_opens,activated_users,d7_retention_pct
2026-11-16,100,10,200,20,25,10,
2026-11-23,150,15,250,25,,,`);
  const k = weeklyKpis(social, funnel);
  assert.equal(k.length, 2);
  assert.equal(k[0].installs, 30);
  assert.equal(k[0].installs_per_post, 3);
  assert.equal(k[0].bio_ctr, 20 / 300);
  assert.equal(k[0].activation_rate, 0.4);
  assert.equal(k[1].views, 2000); // n/a ignored
  assert.equal(k[1].activation_rate, null);
  const md = renderMarkdown(k);
  assert.match(md, /Week of 2026-11-23/);
  assert.match(md, /\+33%/); // installs 30 → 40
});

test('empty metrics render a hint', () => {
  assert.match(renderMarkdown([]), /No metrics yet/);
});
