#!/bin/bash
# Installs the macOS LaunchAgent that runs the daily routine at 09:00 local time (Europe/Istanbul),
# and catches up at login/wake if 09:00 was missed. Local only; remove with uninstall-schedule.sh.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
LABEL=com.meyra.growth.daily
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$REPO/reports/daily/logs" "$REPO/media/work"
# Installing after 09:00 would trigger an immediate catch-up run; unless --run-today is given, start tomorrow.
if [ "${1:-}" != "--run-today" ] && [ "$((10#$(TZ=Europe/Istanbul date +%H)))" -ge 9 ]; then
  touch "$REPO/media/work/.skip-$(TZ=Europe/Istanbul date +%F)"
  echo "Installed after 09:00, so the first automatic run is tomorrow 09:00 (use --run-today to run today)."
fi
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/scripts/daily/run-daily.sh</string><string>--if-due</string></array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$REPO/reports/daily/logs/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$REPO/reports/daily/logs/launchd.err.log</string>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
EOF
plutil -lint "$PLIST"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL → $PLIST"
launchctl print "gui/$(id -u)/$LABEL" | grep -E 'state|program|path =' | head -5
