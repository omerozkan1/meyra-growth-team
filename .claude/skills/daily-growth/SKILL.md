---
name: daily-growth
description: Run Meyra's daily growth routine - check today's calendar slot and approval state, prepare the owner's posting checklist with tracked links, draft replies to comments the owner pasted, and plan tomorrow. Use when the owner says "daily", "bugün ne yapıyoruz", or at the start of a working day.
---
# Daily growth routine (≈15 min, no publishing)

**Automated version:** this routine runs unattended every day at 09:00 (launchd → `scripts/daily/run-daily.sh` →
`scripts/daily/orchestrate.mjs`, see docs/automation.md). When invoked interactively:
- If today's `reports/daily/YYYY-MM-DD.json` exists, summarise it (status, CEO summary, pending approvals, missing assets) and handle
  only what the owner asks for (steps 3–4 below).
- If it doesn't exist and the owner wants it now, run `bash scripts/daily/run-daily.sh` (same as the scheduled job; takes several minutes)
  and then summarise `reports/daily/YYYY-MM-DD.md`.
- Point the owner to the panel (`npm run panel -- --open`, they start it themselves) for previews and approve/reject.

Manual steps (when working interactively):

1. **Today's slot.** Read `content/calendar.csv` for today (Europe/Istanbul date). Run `npm run queue`.
   - If today's video is `approved`: build the owner's posting checklist (below).
   - If it is `in_review`: remind the owner to approve (`npm run approve -- V## --by "<name>"`) or pick a backup approved item.
   - If it is `draft`/missing: hand to the content-director → quality-controller flow now and flag the delay.
2. **Posting checklist** (write to `reports/daily/YYYY-MM-DD.md`):
   - File, platforms, suggested time slot, master file `assets/exports/V##-master.mp4`.
   - Caption per platform copied from the file; resolve `{{LINK:youtube_V##}}` from `tracking/links.csv` (run `npm run links` first). Warn if App Store links still contain `PT_REQUIRED`.
   - Reminder: the owner posts manually and then pastes the post URLs back.
3. **Published URLs.** If the owner pasted URLs, set `status: published` and `published_urls` in that file with Edit (do not touch approval fields), then `npm run validate`.
4. **Community.** If the owner pasted comments/DMs/reviews, the social-manager drafts replies in `reports/daily/YYYY-MM-DD-replies.md`; escalations listed at the top.
5. **Tomorrow.** Check tomorrow's slot: assets needed from the owner (screen recordings), approval state. List them in the daily file.
6. **Close.** `npm run validate` must show 0 errors. Reply to the owner with: today's action (1 line), approvals needed, assets needed, escalations.

Never post, schedule, comment, DM, or approve. If a step needs an account, ask the owner for an export/screenshot.
