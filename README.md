# Meyra AI Growth Team

A local, autonomous marketing operation for Meyra. Every day at 09:00 (Istanbul) the Growth CEO agent plans the day, delegates to
specialist agents, the pipeline renders videos, runs quality control, queues everything for your approval, and writes a report.
**Nothing is ever published automatically.** Real publishing isn't even implemented: the system is dry-run only.

## Owner: one-time setup (5 minutes, in your own terminal)
```bash
cd ~/projects/meyra-growth-team
npm run owner:setup                         # creates your approval signing key in ~/.meyra (never in the repo)
bash scripts/owner/apply-guard-update.sh    # installs guard v2 (shows the diff first)
bash scripts/daily/install-schedule.sh      # 09:00 daily run via launchd (already installed if you see it in the report)
```

## Owner: daily (no prompts needed)
```bash
npm run panel -- --open      # local panel: today's run, video previews, captions, Approve / Reject, past reports
```
- Approving signs the exact script + captions + video. Any change afterwards voids the approval automatically.
- Draft videos (red "TASLAK" stamp) can't be published even if approved. Drop real footage and your voice-over into
  `assets/library/V##/` (see `assets/library/README.md`) and the next run renders a final version.
- Terminal alternative: `npm run approve -- V01` / `npm run reject -- V01 "reason"`.

## How it works
See `docs/automation.md` (schedule, safety, costs), `docs/social-api-requirements.md` (future platform APIs),
`reports/system-audit-2026-11-14.md` (what was verified and what is missing), and `CLAUDE.md` (rules for agents).

## Developer
- `npm run check`: all tests + validator. `npm run daily:test`: short end-to-end run.
- Guardrails: `.claude/settings.json` → `scripts/guard.mjs` (PreToolUse hook). Signed approvals: `scripts/lib/approvals.mjs`.
- `.githooks/pre-commit` runs the validator (secret scan).
