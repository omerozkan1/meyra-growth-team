// KPI computation from manually exported weekly CSVs (until APIs are connected).

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
  if (!lines.length) return [];
  const head = lines[0].split(',').map(s => s.trim());
  return lines.slice(1).map(l => {
    const cells = l.split(',');
    const o = {};
    head.forEach((h, i) => {
      const v = (cells[i] ?? '').trim();
      o[h] = v === '' || /^n\/?a$/i.test(v) ? null : (isNaN(Number(v)) ? v : Number(v));
    });
    return o;
  });
}

const sum = (rows, k) => {
  const vals = rows.map(r => r[k]).filter(v => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
};
export const ratio = (a, b) => (a == null || b == null || b === 0) ? null : a / b;
export const pct = v => v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`;
export const num = v => v == null ? 'n/a' : Number.isInteger(v) ? v.toLocaleString('tr-TR') : v.toFixed(2);
export const delta = (cur, prev) => (cur == null || prev == null || prev === 0) ? 'n/a' : `${cur >= prev ? '+' : ''}${(((cur - prev) / prev) * 100).toFixed(0)}%`;

export function weeklyKpis(social, funnel) {
  const weeks = [...new Set([...social, ...funnel].map(r => r.week_start))].filter(Boolean).sort();
  return weeks.map(w => {
    const s = social.filter(r => r.week_start === w);
    const f = funnel.find(r => r.week_start === w) || {};
    const posts = sum(s, 'posts'), views = sum(s, 'views');
    const profile = sum(s, 'profile_visits'), clicks = sum(s, 'link_clicks');
    const installs = [f.ios_downloads, f.android_acquisitions].some(v => typeof v === 'number') ? (f.ios_downloads || 0) + (f.android_acquisitions || 0) : null;
    const pageViews = [f.ios_product_page_views, f.android_listing_visitors].some(v => typeof v === 'number') ? (f.ios_product_page_views || 0) + (f.android_listing_visitors || 0) : null;
    return {
      week_start: w, posts, views,
      views_per_post: ratio(views, posts),
      saves: sum(s, 'saves'), shares: sum(s, 'shares'),
      bio_ctr: ratio(clicks, profile), link_clicks: clicks,
      store_page_views: pageViews, installs,
      store_cvr: ratio(installs, pageViews),
      first_opens: f.first_opens ?? null,
      activation_rate: ratio(f.activated_users ?? null, f.first_opens ?? null),
      d7_retention_pct: f.d7_retention_pct ?? null,
      installs_per_post: ratio(installs, posts),
      byPlatform: Object.fromEntries(s.map(r => [r.platform, { posts: r.posts, views: r.views, vpp: ratio(r.views, r.posts), clicks: r.link_clicks }])),
    };
  });
}

export function renderMarkdown(kpis) {
  if (!kpis.length) return '_No metrics yet. Fill data/metrics/social_weekly.csv and funnel_weekly.csv._\n';
  const rows = [
    ['Posts', 'posts', num], ['Views', 'views', num], ['Views / post', 'views_per_post', num],
    ['Saves', 'saves', num], ['Shares', 'shares', num], ['Link clicks', 'link_clicks', num], ['Bio CTR (clicks/profile visits)', 'bio_ctr', pct],
    ['Store page views (iOS+Android)', 'store_page_views', num], ['Installs (iOS+Android)', 'installs', num], ['Store conversion', 'store_cvr', pct],
    ['First opens', 'first_opens', num], ['Activation rate', 'activation_rate', pct], ['D7 retention %', 'd7_retention_pct', num],
    ['**Installs per post (north-star proxy)**', 'installs_per_post', num],
  ];
  const last = kpis[kpis.length - 1], prev = kpis[kpis.length - 2];
  let md = `| Metric | Week of ${last.week_start} | ${prev ? `Week of ${prev.week_start} | Δ` : 'Prev | Δ'} |\n|---|---|---|---|\n`;
  for (const [label, k, f] of rows) md += `| ${label} | ${f(last[k])} | ${prev ? f(prev[k]) : 'n/a'} | ${prev ? delta(last[k], prev[k]) : 'n/a'} |\n`;
  md += `\n**By platform (week of ${last.week_start})**\n\n| Platform | Posts | Views | Views/post | Link clicks |\n|---|---|---|---|---|\n`;
  for (const [p, v] of Object.entries(last.byPlatform)) md += `| ${p} | ${num(v.posts)} | ${num(v.views)} | ${num(v.vpp)} | ${num(v.clicks)} |\n`;
  return md;
}
