#!/usr/bin/env bash
# Starts Chrome with remote-debugging-port + isolated agent profile for use
# with the Chrome DevTools MCP server (#190).
#
# The isolated profile separates agent-controlled browsing from your regular
# Chrome session (no cookies, logins, or extensions leak into agent-inspected
# pages). The profile persists between runs under /tmp so authenticated
# sessions survive restarts, but it is NEVER your personal profile.
#
# Usage:
#   ./scripts/chrome-agent.sh         # opens Beta
#   ./scripts/chrome-agent.sh <url>   # opens given URL
#
# After launch, start Claude Code in this repo — the MCP server configured
# in .claude/settings.local.json will attach to port 9222.
#
# SECURITY: port 9222 is reachable from any local process. Only run this
# script when actively doing agent testing; close Chrome when done.

set -euo pipefail

PORT="${CHROME_AGENT_PORT:-9222}"
PROFILE="${CHROME_AGENT_PROFILE:-/tmp/chrome-agent-profile}"
URL="${1:-https://holiday-planner-beta.web.app/}"

case "$(uname -s)" in
  Darwin)
    CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ;;
  Linux)
    CHROME="$(command -v google-chrome || command -v chromium || echo '')"
    ;;
  *)
    echo "Unsupported OS: $(uname -s). Edit this script manually." >&2
    exit 1
    ;;
esac

if [ -z "$CHROME" ] || [ ! -x "$CHROME" ]; then
  echo "Chrome binary not found at: $CHROME" >&2
  exit 1
fi

mkdir -p "$PROFILE"

echo "Launching Chrome (agent profile) on port $PORT"
echo "  profile: $PROFILE"
echo "  url:     $URL"
echo "  (close this window when done — port stays open while Chrome runs)"

exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  "$URL"
