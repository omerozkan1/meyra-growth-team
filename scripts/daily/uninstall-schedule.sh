#!/bin/bash
# Removes the daily LaunchAgent.
LABEL=com.meyra.growth.daily
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "stopped $LABEL" || echo "$LABEL was not loaded"
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist" && echo "removed plist"
