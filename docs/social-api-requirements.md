# Social platform APIs: requirements (nothing connected yet)

> Status 2026-11-14: **no account connected, no app registered, no token stored.** This is the checklist to do it later with official APIs only.
> Limits change often; items marked ⚠ had conflicting sources when checked and must be re-verified on the live docs before building.
> Recommended design for Meyra: **read-only analytics first; publishing only through the existing signed-approval gate**
> (`scripts/publish/publish.mjs` refuses anything without a valid owner signature and a final, non-draft video).

## Instagram (Reels): Instagram Platform API
| Item | Requirement |
|---|---|
| Account | `@meyranamazvakitleri` must be a **Professional** account (Business or Creator) |
| Developer side | Meta developer account → create an app (Business type) → add the "Instagram" product |
| Login path (pick one) | **Instagram Login** (no Facebook Page needed; host graph.instagram.com) or **Facebook Login** (IG account linked to a Facebook Page; host graph.facebook.com) |
| Scopes, Instagram Login | `instagram_business_basic`, `instagram_business_manage_insights` (analytics), `instagram_business_content_publish` (publishing), `instagram_business_manage_comments` (only if we draft/post replies later) |
| Scopes, Facebook Login | `instagram_basic`, `instagram_manage_insights`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` |
| Access level | Your own account (added as an app role) works in development mode. **App Review + Business Verification** is required for advanced access/live mode |
| Publishing flow | Create a media container (`media_type=REELS`) → poll status → `media_publish`. The video must be reachable by Meta: a **public URL** at publish time, or the resumable upload flow |
| Limits ⚠ | Rolling 24 h API publishing cap (docs say 100; older reference pages say 50). Check `GET /{ig-user-id}/content_publishing_limit` |
| Video spec | MP4/MOV, H.264, AAC, 9:16, Reels length limits per current docs (our renders: 1080×1920, 30 fps, H.264/AAC ✔) |
| Cost | Free |
| Owner inputs needed | Professional account confirmation; Meta developer account; privacy policy URL (exists: /tr/privacy, needs the fixes in the discovery report first) |

## TikTok: Content Posting API + Display API
| Item | Requirement |
|---|---|
| Account | `@meyraapp` (Business account recommended for analytics) |
| Developer side | developers.tiktok.com account → create an app → add **Login Kit** + **Content Posting API** (and Display API for stats). Needs app icon, description, **privacy policy + terms URLs**, and a demo video for review |
| Scopes | `user.info.basic`; `video.upload` (**send a draft to the creator's TikTok inbox**; the owner finishes and posts in the app, which fits our approval model best); `video.publish` (Direct Post); `user.info.stats` + `video.list` (analytics) |
| Audit | **Unaudited apps can only post privately** (SELF_ONLY), limited to a few users per 24 h. A separate Content Posting audit (UX + ToS compliance) lifts it. Third-party reports say 2–6 weeks ⚠. Posts made before the audit stay private |
| Direct Post UX rules | Must query creator info, let the user pick privacy and interaction settings, show a preview, and get explicit consent per post |
| Upload | `FILE_UPLOAD` (chunked, from our machine; no domain verification) or `PULL_FROM_URL` (needs verified domain/URL prefix) |
| Cost | Free |
| Recommendation | Start with `video.upload` (inbox draft) + Display API stats. Skip Direct Post |

## YouTube (Shorts): YouTube Data API v3 + YouTube Analytics API
| Item | Requirement |
|---|---|
| Account | `@meyranamazvakitleri` channel; the owner's Google account must manage it |
| Developer side | Google Cloud project → enable **YouTube Data API v3** and **YouTube Analytics API** → OAuth consent screen (External) → OAuth client (Desktop) |
| Scopes | `youtube.readonly`, `yt-analytics.readonly` (analytics); `youtube.upload` (publishing; sensitive scope) |
| Verification | Sensitive scopes need **Google OAuth verification** for production. In "Testing" status, refresh tokens expire after 7 days |
| Audit ⚠ | Google's reference has said uploads from **unverified API projects created after 28 Jul 2020 are locked to private** until the project passes the YouTube API compliance audit; one third-party source reports this changed in Oct 2026. Re-check the live `videos.insert` page |
| Quota ⚠ | Default 10,000 units/day. Upload cost was 1,600 units; recent sources say uploads moved to a separate bucket (~100 uploads/day). Verify in the Cloud console quota page |
| Shorts | Vertical video ≤ 3 min is classified as a Short automatically; `#Shorts` in title/description is optional |
| Cost | Free |

## What we will build (after the owner registers apps; all free)
1. `scripts/integrations/*-insights.mjs`: read-only pulls into `data/metrics/*.csv` (replaces manual exports).
2. Publishing adapters behind `scripts/publish/publish.mjs`. They run **only** for owner-signed, final videos, are triggered by the owner (panel button or terminal), and default to the safest mode: TikTok inbox draft, YouTube `private`, Instagram only after explicit confirmation.
3. Tokens in macOS Keychain or `~/.meyra/` (never in the repo). The guard already blocks agents from reading them and from calling platform write endpoints.

## Owner checklist (in order)
- [ ] Confirm all three accounts are Professional/Business and you are admin
- [ ] Fix privacy policy inconsistencies (TR/EN/AR) since all three platforms review it
- [ ] Create Meta, TikTok and Google Cloud developer accounts (free)
- [ ] Decide: analytics only first (recommended) vs analytics + inbox-draft publishing
- [ ] Then ask the team to build the read-only connectors
