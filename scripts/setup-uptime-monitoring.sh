#!/usr/bin/env bash
#
# #215 — Set up Google Cloud Uptime Check + Alert-Policy for Prod.
#
# What this creates (in project roman-holiday-planner-6ac48):
#   1. NotificationChannel: email → stefan.kummert@gmail.com
#   2. UptimeCheckConfig: HTTPS GET on https://holiday-planner.web.app/
#      every 60s, expects HTTP 200, 10s timeout
#   3. AlertPolicy: fires when the uptime check fails for >2 consecutive
#      minutes; routes to the email channel above
#
# Idempotent: re-running detects existing resources by display-name and
# skips creation. Edit the *_NAME constants below to make a fresh setup
# alongside the old one.
#
# Cost: stays within the Google Cloud Monitoring Free Tier
# (1 uptime-check / 1 min, 1 alert-policy, ≤5 notification-channels).
#
# Usage:
#   ./scripts/setup-uptime-monitoring.sh           # dry-run (default)
#   ./scripts/setup-uptime-monitoring.sh --apply   # actually create
#
# Requires:
#   - gcloud CLI authenticated as an account with Monitoring Admin role
#     on roman-holiday-planner-6ac48 (Stefan's gmail has it via owner)

set -euo pipefail

PROJECT_ID="roman-holiday-planner-6ac48"
EMAIL="stefan.kummert@gmail.com"
HOST="holiday-planner.web.app"

CHANNEL_NAME="Stefan email (alerts)"
UPTIME_NAME="Holiday Planner Prod — root"
POLICY_NAME="Holiday Planner Prod down"

APPLY=false
if [ "${1:-}" = "--apply" ]; then APPLY=true; fi

if [ "$APPLY" = false ]; then
  cat <<EOF
[setup-uptime] DRY-RUN — pass --apply to actually create resources.

Project:  $PROJECT_ID
Host:     $HOST
Email:    $EMAIL

Will create (idempotent — skipped if already present):
  Channel: $CHANNEL_NAME (email)
  Uptime:  $UPTIME_NAME (every 60s, HTTPS GET /, HTTP 200, 10s timeout)
  Policy:  $POLICY_NAME (>2 min downtime → email)
EOF
  exit 0
fi

echo "[setup-uptime] Project: $PROJECT_ID"

# Ensure Monitoring API is enabled (idempotent)
echo "[setup-uptime] Enabling APIs..."
gcloud services enable monitoring.googleapis.com --project="$PROJECT_ID" -q

# ─── 1. Notification Channel (email) ───────────────────────────────
EXISTING_CHANNEL=$(
  gcloud alpha monitoring channels list \
    --project="$PROJECT_ID" \
    --filter="displayName=\"$CHANNEL_NAME\" AND type=email" \
    --format="value(name)" 2>/dev/null | head -1
)

if [ -n "$EXISTING_CHANNEL" ]; then
  echo "[setup-uptime] ✓ Channel exists: $EXISTING_CHANNEL"
  CHANNEL_ID="$EXISTING_CHANNEL"
else
  echo "[setup-uptime] Creating email channel..."
  CHANNEL_TMP=$(mktemp)
  cat > "$CHANNEL_TMP" <<EOF
{
  "type": "email",
  "displayName": "$CHANNEL_NAME",
  "labels": { "email_address": "$EMAIL" },
  "enabled": true
}
EOF
  CHANNEL_ID=$(
    gcloud alpha monitoring channels create \
      --project="$PROJECT_ID" \
      --channel-content-from-file="$CHANNEL_TMP" \
      --format="value(name)"
  )
  rm -f "$CHANNEL_TMP"
  echo "[setup-uptime] ✓ Channel created: $CHANNEL_ID"
fi

# ─── 2. Uptime Check ───────────────────────────────────────────────
EXISTING_UPTIME=$(
  gcloud monitoring uptime list-configs \
    --project="$PROJECT_ID" \
    --filter="displayName=\"$UPTIME_NAME\"" \
    --format="value(name)" 2>/dev/null | head -1
)

if [ -n "$EXISTING_UPTIME" ]; then
  echo "[setup-uptime] ✓ Uptime check exists: $EXISTING_UPTIME"
  UPTIME_ID="$EXISTING_UPTIME"
else
  echo "[setup-uptime] Creating uptime check..."
  UPTIME_ID=$(
    gcloud monitoring uptime create "$UPTIME_NAME" \
      --project="$PROJECT_ID" \
      --resource-type=uptime-url \
      --resource-labels=host="$HOST",project_id="$PROJECT_ID" \
      --protocol=https \
      --path=/ \
      --port=443 \
      --period=1 \
      --timeout=10 \
      --status-codes=200 \
      --format="value(name)"
  )
  echo "[setup-uptime] ✓ Uptime check created: $UPTIME_ID"
fi

UPTIME_SHORT=$(basename "$UPTIME_ID")

# ─── 3. Alert Policy ───────────────────────────────────────────────
EXISTING_POLICY=$(
  gcloud alpha monitoring policies list \
    --project="$PROJECT_ID" \
    --filter="displayName=\"$POLICY_NAME\"" \
    --format="value(name)" 2>/dev/null | head -1
)

if [ -n "$EXISTING_POLICY" ]; then
  echo "[setup-uptime] ✓ Alert policy exists: $EXISTING_POLICY"
  POLICY_ID="$EXISTING_POLICY"
else
  echo "[setup-uptime] Creating alert policy..."
  POLICY_TMP=$(mktemp)
  cat > "$POLICY_TMP" <<EOF
{
  "displayName": "$POLICY_NAME",
  "combiner": "OR",
  "conditions": [{
    "displayName": "Uptime check failing",
    "conditionThreshold": {
      "filter": "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id=\"$UPTIME_SHORT\"",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_NEXT_OLDER",
        "crossSeriesReducer": "REDUCE_COUNT_FALSE",
        "groupByFields": ["resource.label.host"]
      }],
      "comparison": "COMPARISON_GT",
      "duration": "120s",
      "trigger": { "count": 1 },
      "thresholdValue": 1
    }
  }],
  "alertStrategy": { "autoClose": "604800s" },
  "notificationChannels": ["$CHANNEL_ID"],
  "enabled": true
}
EOF
  POLICY_ID=$(
    gcloud alpha monitoring policies create \
      --project="$PROJECT_ID" \
      --policy-from-file="$POLICY_TMP" \
      --format="value(name)"
  )
  rm -f "$POLICY_TMP"
  echo "[setup-uptime] ✓ Alert policy created: $POLICY_ID"
fi

cat <<EOF

[setup-uptime] DONE.

Resources in project $PROJECT_ID:
  Channel: $CHANNEL_ID
  Uptime:  $UPTIME_ID
  Policy:  $POLICY_ID

Console:
  https://console.cloud.google.com/monitoring/uptime?project=$PROJECT_ID
  https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID

Test: temporarily change firebase.json hosting rewrites to return 500,
deploy, wait ~3 min — you should get an email. Revert immediately after.
EOF
