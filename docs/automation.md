# Daily automation: how it runs

## What was checked (2026-11-14)
| Option | Available? | Verdict |
|---|---|---|
| Claude Code `CronCreate` (session scheduler) | Yes | ❌ Not suitable: jobs live only inside an open Claude session, are lost when it exits, and expire after 7 days |
| Claude Code cloud **Routines** (scheduled cloud agents) | Yes, the account has the remote-trigger API | ⚠️ Possible later, but it runs in Anthropic's cloud on a **GitHub repo**. This project has no remote (pushing is an owner decision), and the cloud box would need ffmpeg plus the media library each run. Not set up |
| **macOS launchd** (LaunchAgent) | Yes | ✅ **Chosen.** Free, local, survives reboots, uses the logged-in Claude Code CLI |

## How the local schedule works
```
launchd (com.meyra.growth.daily)  ── 09:00 Europe/Istanbul, plus at login (catch-up)
  └─ scripts/daily/run-daily.sh --if-due      (skips if before 09:00 or today already ran; lock prevents overlap)
       └─ node scripts/daily/orchestrate.mjs  (DRY-RUN; writes reports/daily/YYYY-MM-DD.json + .md)
            1. preflight: tests + validator
            2. claude -p --agent growth-ceo   (headless; strict tool allowlist; delegates via Agent tool to
               content-director → video-producer → social-manager → quality-controller)
            3. python3 media/pipeline/render.py --all   (only re-renders changed items)
            4. validator  5. approvals/pending sync  6. tracking links  7. report + macOS notification
```
- Install: `bash scripts/daily/install-schedule.sh` · Remove: `bash scripts/daily/uninstall-schedule.sh`
- Run now (forced): `npm run daily` · Short test: `npm run daily:test`
- Logs: `reports/daily/logs/` · Results: panel (`npm run panel -- --open`) or `reports/daily/YYYY-MM-DD.md`

### Mac asleep or off at 09:00
- **Asleep:** launchd fires the missed 09:00 job when the Mac wakes.
- **Shut down:** at the next login, `RunAtLoad` + `--if-due` catches up the same day.
- To have the Mac wake itself (optional, needs your admin password, owner decision): `sudo pmset repeat wakeorpoweron MTWRFSU 08:55:00`

### Safety in unattended mode
- The CEO session can only: read, write inside `content/` and `reports/`, use the Agent tool, run `npm run validate|queue`, `npm test`, `ls`,
  and fetch from kuran.diyanet.gov.tr / dinisorular.diyanet.gov.tr / meyraapp.com. Everything else is denied automatically (no prompts in `-p` mode).
- The project guard hook also applies to headless runs.
- No publishing code path exists (publish gate is dry-run only), and approval needs the owner key in `~/.meyra`.

## Cost
- launchd, ffmpeg, Python, the panel: **0 TL**.
- Claude usage: each run uses the Claude plan you're logged in with. See the measured test-run figure in
  `reports/system-audit-2026-11-14.md`. The JSON `total_cost_usd` is an API-price *equivalent*; on a subscription plan it
  counts against plan limits instead of being billed. Optional cap for model choice: set `MEYRA_CEO_MODEL=sonnet` in the LaunchAgent.

## If it must run while the Mac is off (cloud options; none set up, all need your decision)
| Option | What's needed | Rough cost |
|---|---|---|
| Claude Code cloud Routine | Private GitHub repo (push = owner decision), cloud environment setup script installing ffmpeg, footage stored somewhere the cloud can reach | Uses your Claude plan's usage; no separate server fee |
| GitHub Actions cron + Claude Code with an **API key** | Private repo, `ANTHROPIC_API_KEY` secret (pay per token) | Actions: free tier minutes; API: per-run token cost (see measured figure ×30/month). **Paid API → needs your approval** |
| Small always-on VPS (e.g. a €4–6/month instance) | Server setup, Claude Code login, ffmpeg | ≈ 200–300 TL/month + Claude usage; **paid → needs your approval** |

Recommendation: keep launchd; optionally enable `pmset` wake. Revisit cloud only if you need runs while travelling with the Mac closed.
