---
name: weekly-report
description: Produce Meyra's weekly growth report - KPIs from data/metrics, per-video performance, winners/losers, decisions per strategy rules, and next week's plan and approval batch. Use on Sundays, or when asked for a weekly report, haftalık rapor, or performance review.
---
# Weekly report

Output: `reports/weekly/YYYY-Www.md` (ISO week). Delegate numbers to growth-analyst, plan to growth-ceo.

1. **Data check.** Confirm `data/metrics/social_weekly.csv` and `funnel_weekly.csv` have rows for the week (week_start = Monday). If missing, ask the owner for: IG/TikTok/YouTube weekly insights (screenshots or CSV), ASC downloads + product page views (TR), Play acquisitions + listing visitors (TR), and Firebase first_open/retention if available. Do not estimate missing values.
2. **KPIs.** Run `npm run metrics` and paste the table.
3. **Per-platform sections** (Instagram, TikTok, YouTube separately: followers, reach/views, engagement, profile visits, link clicks), then the combined view.
4. **Per-video table.** For each video published this week (status published): platform views, saves, shares, link clicks, views vs account median → label winner (≥ 2x) / keep / drop (< 1.5x after 3 posts in the format).
5. **Store signals.** Public ratings and counts (re-fetch store pages), new reviews themes, install trend vs post dates (correlation, labelled as such).
6. **Decisions.** Apply config/strategy.md decision rules; list remakes, drops, hook tests.
7. **Next week.** 5 slots with IDs/titles/pillars, assets the owner must record, approvals needed (with `npm run queue` output), owner decisions pending (from research/brand-discovery §9 and tracking/integrations.md).
8. **Integrity.** `npm run validate` → 0 errors. State clearly which data sources were manual, which are not connected.
Keep it to one screen of summary at the top: 3 numbers, 3 learnings, 3 actions.
