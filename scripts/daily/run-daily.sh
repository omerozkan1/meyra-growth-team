#!/bin/bash
# Entry point for the daily run (launchd 09:00 Europe/Istanbul, catch-up at login/wake, or manual).
#   bash scripts/daily/run-daily.sh            # manual full run (forced)
#   bash scripts/daily/run-daily.sh --test     # short test run
#   bash scripts/daily/run-daily.sh --if-due   # launchd: run only if it's >= 09:00 and today hasn't completed yet
set -uo pipefail
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export MEYRA_DRY_RUN=1
cd "$(dirname "$0")/../.." || exit 1
TODAY=$(TZ=Europe/Istanbul date +%F)
HOUR=$(TZ=Europe/Istanbul date +%H)
mkdir -p reports/daily/logs
LOG="reports/daily/logs/$TODAY.log"

MODE_ARGS=() ; TRIGGER=manual
for a in "$@"; do
  case "$a" in
    --test) MODE_ARGS+=(--test) ;;
    --if-due) TRIGGER=launchd ;;
    --skip-ceo) MODE_ARGS+=(--skip-ceo) ;;
  esac
done

if [ "$TRIGGER" = launchd ]; then
  if [ "$((10#$HOUR))" -lt 9 ]; then echo "$(date) not due yet (before 09:00)" >> "$LOG"; exit 0; fi
  if [ -f "media/work/.skip-$TODAY" ]; then echo "$(date) skipped: schedule installed after 09:00 today, first run tomorrow" >> "$LOG"; exit 0; fi
  if [ -f "reports/daily/$TODAY.json" ] && grep -qE '"status": "(ok|partial|failed)"' "reports/daily/$TODAY.json"; then
    echo "$(date) already ran today" >> "$LOG"; exit 0
  fi
fi

LOCK="media/work/.daily.lock"
mkdir -p media/work
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then rmdir "$LOCK"; mkdir "$LOCK"; else echo "$(date) another run in progress" >> "$LOG"; exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

echo "=== $(date) start trigger=$TRIGGER args=${MODE_ARGS[*]:-}" >> "$LOG"
node scripts/daily/orchestrate.mjs --trigger "$TRIGGER" "${MODE_ARGS[@]}" >> "$LOG" 2>&1
CODE=$?
echo "=== $(date) end exit=$CODE" >> "$LOG"
# Local macOS notification for the owner (no external service).
osascript -e "display notification \"Günlük çalışma bitti (exit $CODE). Panel: npm run panel\" with title \"Meyra Growth\"" >/dev/null 2>&1 || true
exit $CODE
