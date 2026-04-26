#!/usr/bin/env bash
#
# Rollback Production by re-running a previous successful Prod-deploy
# workflow. Equivalent to "Option B" in docs/runbooks/rollback-prod.md.
#
# Usage:
#   ./scripts/rollback-prod.sh                # interactive: lists last 10
#   ./scripts/rollback-prod.sh <RUN_ID>       # direct: re-runs that ID
#
# Note: Re-run uses the original commit SHA of that workflow run, NOT
# current main. That's the point — you get the old code back without
# touching git.
#
set -euo pipefail

REPO="stekum/roman-holiday-planner"

if [ $# -ge 1 ]; then
  RUN_ID="$1"
else
  echo "Last 10 Prod-deploy runs:"
  echo
  gh run list --repo "$REPO" --workflow="Deploy Firebase Prod" --limit 10 \
    --json databaseId,createdAt,conclusion,headSha \
    --template '{{range .}}{{.databaseId}}  {{.createdAt}}  {{printf "%-9s" .conclusion}}  {{slice .headSha 0 7}}{{"\n"}}{{end}}'
  echo
  read -r -p "Run-ID to re-run (Enter to abort): " RUN_ID
  [ -z "$RUN_ID" ] && { echo "Aborted."; exit 1; }
fi

echo
echo "Re-running run $RUN_ID — this will redeploy the original commit to Production."
read -r -p "Type 'rollback' to confirm: " CONFIRM
if [ "$CONFIRM" != "rollback" ]; then
  echo "Aborted."
  exit 1
fi

gh run rerun "$RUN_ID" --repo "$REPO"
echo
echo "Re-run started. Watching..."
gh run watch "$RUN_ID" --repo "$REPO" --exit-status
echo
echo "✓ Rollback deployed. Verify at https://holiday-planner.web.app/"
echo
echo "Reminder: main still has the broken commit. Open an issue, push a fix or revert to main,"
echo "then trigger a regular deploy via 'npm run deploy'."
