---
name: seo-audit
description: Audit meyraapp.com and Meyra's App Store and Google Play listings (public pages only) for SEO/ASO issues and produce a dated report plus an updated backlog of proposed changes. Use when asked for an SEO audit, ASO review, website check or store listing review.
---
# SEO / ASO audit (read-only)

Delegate to seo-aso-specialist. Public pages only; never log in, never change anything.

1. **Fetch** (curl with a normal browser UA; save raw HTML in the session scratchpad, not the repo):
   - `https://meyraapp.com/{tr,en,ar}`, `/tr/privacy`, `/en/privacy`, `/tr/support`, `/tr/terms`, `/robots.txt`, `/sitemap.xml`
   - App Store: `https://apps.apple.com/tr/app/id6759878169?l=tr` and `/us/app/id6759878169`
   - Play: `https://play.google.com/store/apps/details?id=com.omerozkan.meyra&hl=tr&gl=TR` and `&hl=en`
2. **Website checks:** HTTP status, `<title>`/meta/OG per locale (language matches?), `hreflang`, canonical, robots/sitemap real files (not HTML soft-404), analytics tags present (gtag/GTM), store links carry tracking params, copy uses only approved claims (config/brand.md), privacy pages consistent across languages.
3. **Store checks:** name/subtitle/short description per locale with character counts, rating + count, install bucket, latest version/date, screenshot count, privacy/data-safety labels, IAP prices, consistency with website and privacy policy.
4. **Diff** against the previous `research/seo-audit-*.md` (or `research/brand-discovery-2026-11-14.md` for the first run): what got fixed, what's new.
5. **Write** `research/seo-audit-YYYY-MM-DD.md` with [V]/[A] markers, and update `research/seo-aso-backlog.md` (priority, change, effort, status).
6. **Report** to the owner: top 3 fixes by impact, anything that is a compliance/trust risk first.
