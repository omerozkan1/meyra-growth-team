# Integrations Status

> **As of 2026-11-14 no account is connected to this workspace.** Agents must not claim otherwise. Update this table only when the owner confirms access.

| Integration | What it gives us | Official access method | Cost | Status | Owner action needed |
|---|---|---|---|---|---|
| **GA4** (website) | Sessions by UTM, `store_click` | GA4 Data API (read-only service account, Viewer role) | Free | ❌ No GA4 tag on meyraapp.com | Create a property + add the tag (site change) |
| **Firebase Analytics** (app) | first_open, events, retention, demographics | Firebase console; GA4 Data API on the linked property; optional BigQuery export (free sandbox tier) | Free | ❓ SDK named in EN privacy policy; access not granted | Add a read-only (Viewer) user or service account |
| **App Store Connect** | Impressions, product page views, downloads, sources, campaigns, retention | App Store Connect API → Analytics Reports (API key with the **Sales/Reports** or **Read-only** role; .p8 stored outside the repo) | Free | ❌ not connected | Generate the provider token `pt` for campaign links (needed first); optionally an API key |
| **Google Play Console** | Store listing visitors, acquisitions by source/UTM, retention, ratings | Play Console reports export to Cloud Storage (`gs://pubsite_prod_…`); Play Developer Reporting API (vitals). **Publishing API is blocked by our guard** | Free | ❌ not connected | Invite a read-only user, or share monthly CSV exports |
| **Instagram** | Reach, plays, saves, shares, profile visits, link taps | Instagram Graph API (Professional account linked to a Facebook Page; `instagram_manage_insights`; read-only) | Free | ❌ handle not supplied | Supply the handle; optional app review for API |
| **TikTok** | Views, watch time, profile views | TikTok Business account analytics (manual export). TikTok's public APIs for insights are limited, so manual export is fine | Free | ❌ | Supply the handle |
| **YouTube** | Shorts views, retention, subscribers | YouTube Analytics API (OAuth, `yt-analytics.readonly`) | Free | ❌ | Supply the channel |
| **Google Search Console** | Search queries, indexing | Search Console API (read-only) | Free | ❌ | Verify domain (DNS) |
| **RevenueCat** | Trials, conversions | RevenueCat REST API v2 (read-only secret key) | Free tier | ❌ | Optional, later |

## Rules
- Read-only scopes only. No write scopes, ever (publishing stays manual).
- Keys and tokens live in `.env` or outside the repo (paths in `.env`). Never paste them into chat transcripts, content files or reports.
- Until connected, the **manual CSV process** in `measurement-plan.md` is the official path.
- Before building any API connector, check: (1) the owner has granted access, (2) it's free, (3) it's read-only.
