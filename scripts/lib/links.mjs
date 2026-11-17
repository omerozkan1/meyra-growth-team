// Tracked link builders for website, Google Play (install referrer) and App Store (campaign token).
export const IOS_APP_ID = '6759878169';
export const ANDROID_PKG = 'com.omerozkan.meyra';
export const SITE = 'https://meyraapp.com';

export function utmParams({ source, medium = 'social', campaign, content }) {
  const p = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign });
  if (content) p.set('utm_content', content);
  return p;
}

export function websiteLink({ lang = 'tr', path = 'download', ...utm }) {
  return `${SITE}/${lang}/${path}?${utmParams(utm).toString()}`;
}

// Google Play: UTM values passed via the `referrer` param are reported in Play Console acquisition reports.
export function playLink({ lang = 'tr', ...utm }) {
  const referrer = utmParams(utm).toString();
  return `https://play.google.com/store/apps/details?id=${ANDROID_PKG}&hl=${lang}&referrer=${encodeURIComponent(referrer)}`;
}

// App Store: campaign links need the developer's provider token (pt). ct is max 40 chars and shows up in App Store Connect > Sources > Campaigns.
export function appStoreLink({ providerToken, ct, country = 'tr' }) {
  const campaign = String(ct).slice(0, 40);
  const pt = providerToken || 'PT_REQUIRED';
  return `https://apps.apple.com/${country}/app/apple-store/id${IOS_APP_ID}?pt=${encodeURIComponent(pt)}&ct=${encodeURIComponent(campaign)}&mt=8`;
}

export const PLATFORM_SHORT = { instagram: 'ig', tiktok: 'tt', youtube: 'yt' };

export function buildPlacements(videos, providerToken) {
  const rows = [];
  for (const platform of Object.keys(PLATFORM_SHORT)) {
    rows.push(row({ placement: `${platform}_bio`, source: platform, campaign: 'bio', content: '', providerToken }));
  }
  for (const v of videos) {
    for (const platform of v.platforms || []) {
      rows.push(row({ placement: `${platform}_${v.id}`, source: platform, campaign: 'organic_video', content: v.id, providerToken }));
    }
  }
  return rows;
}

function row({ placement, source, campaign, content, providerToken }) {
  const ct = [PLATFORM_SHORT[source], campaign, content].filter(Boolean).join('_');
  return {
    placement,
    website: websiteLink({ source, campaign, content }),
    play: playLink({ source, campaign, content }),
    appstore: appStoreLink({ providerToken, ct }),
  };
}

export function toCsv(rows) {
  const cols = ['placement', 'website', 'play', 'appstore'];
  const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(String(r[c] ?? ''))).join(','))].join('\n') + '\n';
}
