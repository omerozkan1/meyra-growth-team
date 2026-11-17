# Measurement Plan

**Principle:** measure the whole funnel. Where a step can't be measured yet, say so and use the best available proxy. No connected accounts are assumed (see `integrations.md`).

## Funnel and definitions

| # | Stage | Definition | Primary source | Measurable today? |
|---|---|---|---|---|
| 1 | Content reach | Views, 3-s hold, avg % watched, saves, shares per post | IG Insights, TikTok Analytics, YouTube Studio | ✅ natively, but owner exports (no API connected) |
| 2 | Profile → link click | Profile visits, bio link taps | IG Insights ("external link taps"), TikTok (Business account), YouTube (no bio-link metric; use description link clicks via the campaign token) | ✅ natively, manual |
| 3 | Website visit | Sessions on meyraapp.com by `utm_source` | GA4 | ❌ **no analytics tag on the site** (verified 2026-11-14) |
| 4 | Store click | Clicks on App Store / Google Play buttons on the site | GA4 event `store_click` | ❌ needs the GA4 tag + event |
| 5a | Store page view (iOS) | Product page views, by source & campaign | App Store Connect → App Analytics (Sources: App Store Search/Browse, Web Referrer, App Referrer, **Campaigns** via `pt`/`ct`) | ⚠️ available to the owner; not connected |
| 5b | Store listing visit (Android) | Store listing visitors, by traffic source & **UTM campaign** | Play Console → Statistics / Store performance → traffic sources; UTM campaigns via the `referrer` param | ⚠️ available to the owner; not connected |
| 6 | Install | iOS "First-time downloads"; Android "Store listing acquisitions" / "New users acquired" | ASC / Play Console | ⚠️ owner |
| 7 | First launch | `first_open` (automatic) | Firebase Analytics (named in the EN privacy policy) | ⚠️ likely exists in the app; needs read access |
| 7b | Onboarding completion | User finishes the first-run flow (owner KPI in `brand.md`) | Firebase custom event `onboarding_complete` (to confirm) | ❓ depends on the app's events |
| 8 | Activation | **Proposed:** within 24 h of `first_open`, the user grants location **and** reaches prayer times, **or** performs a core action (zikir count, Quran read, kaza entry, assistant question) | Firebase custom events | ❓ depends on which custom events exist; owner/dev to confirm |
| 9 | Retention | D1 / D7 / D30 retention of new users (Firebase cohort); ASC "Retention" (opt-in users only); Play "Retained installers" | Firebase / ASC / Play | ⚠️ owner |
| 10 | Premium conversion (owner secondary KPI) | Trial starts, Premium conversions | RevenueCat (named in privacy policy) | ⚠️ owner; out of scope for organic KPIs but useful for LTV |

**North-star proxy (30 days):** *TR installs (iOS + Android) per published video*, read weekly against the W1 baseline. It moves to *activated users per week* once Firebase access exists.

## Attribution approach (free, no SDK changes needed for steps 1–6)

1. **Bio links** → `meyraapp.com/tr/download?utm_source=<platform>&utm_medium=social&utm_campaign=bio`
2. **YouTube descriptions** (clickable) → store links directly:
   - Play: `…details?id=com.omerozkan.meyra&referrer=utm_source%3Dyoutube%26utm_medium%3Dsocial%26utm_campaign%3Dorganic_video%26utm_content%3DV01` → shows in Play Console UTM report
   - App Store: `apps.apple.com/tr/app/apple-store/id6759878169?pt=<PROVIDER_TOKEN>&ct=yt_organic_video_V01&mt=8` → shows in ASC Campaigns
3. All links come from `npm run links` → `tracking/links.csv`. The `pt` token goes in `.env` as `MEYRA_APPLE_PT`.
4. **Limitation:** IG/TikTok bio clicks reach the website, but without GA4 and UTM forwarding to the store buttons, the chain breaks at step 3. Until it's fixed, use **time-series correlation**: compare daily TR installs with post dates and view spikes (weekly report does this).
5. **Dark social:** WhatsApp shares are invisible. Track "shares" as a leading indicator.

## Website changes to request from the owner (production, not done by agents)

| Priority | Change | Why |
|---|---|---|
| P0 | Add GA4 (free) with consent banner (KVKK/GDPR, owner's legal call) | Steps 3–4 |
| P0 | Fire `store_click` event with params `store` (ios/android), `lang`, `page` on store-button clicks | Step 4 |
| P0 | On `/[lang]/download` and buttons: forward incoming `utm_*` to the Play `referrer` param and map to Apple `ct` | Links social → install |
| P1 | Link GA4 ↔ Firebase project (same Google account) for one funnel view | Steps 3–9 in one place |
| P1 | Search Console verification + sitemap | SEO measurement |

## Firebase events to confirm/propose (owner/dev)
Automatic: `first_open`, `session_start`, `user_engagement`, `app_remove` (Android), `in_app_purchase`.
Ask whether these custom events exist (or add them; app change, owner decision):

| Event | Params | Used for |
|---|---|---|
| `location_permission_result` | `granted` (bool) | Activation step |
| `prayer_times_viewed` | `city` (coarse) | Activation |
| `notification_enabled` | `prayer` | Activation, retention driver |
| `zikr_count` | `count_bucket` | Core action |
| `quran_read` / `quran_lesson_completed` | `surah` / `lesson_id` | Core action |
| `kaza_entry_added` | – | Core action |
| `assistant_question` | – (never log question text) | Core action |
| `qibla_opened` | – | Utility usage |

Privacy: never log free-text, precise location, or anything that identifies a person. Keep the privacy policy in sync (see discovery report issue #1).

## Data collection rhythm (until APIs are connected)
- **Every Sunday (10 min, owner or agent with owner-provided screenshots/exports):** fill `data/metrics/social_weekly.csv` and `data/metrics/funnel_weekly.csv`.
- Then run `/weekly-report`, which calls `npm run metrics` and writes `reports/weekly/YYYY-Www.md`.
