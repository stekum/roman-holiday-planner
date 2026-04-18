#!/usr/bin/env bash
# finalize-release-milestone.sh — Single-command Milestone-Close nach Release.
#
# Setzt in einem Rutsch:
#   - state=closed
#   - due_on=<datum>T12:00:00Z  (Mittag UTC, verhindert Timezone-Shift)
#   - description=✅ Released <datum> — <kurzinfo>
#
# Das exakte Präfix "✅ Released YYYY-MM-DD" triggert den grünen Release-Badge
# in der GitHub Project Board Roadmap-View. Siehe Memory
# feedback_milestone_description_release_badge.md — Thema wurde mehrfach
# vergessen, daher dieses Script.
#
# Usage:
#   ./scripts/finalize-release-milestone.sh "<milestone-titel-prefix>" <release-datum> <kurzinfo>
#
# Beispiel:
#   ./scripts/finalize-release-milestone.sh "v1.5 — AI" 2026-04-18 "AI Features"
#   ./scripts/finalize-release-milestone.sh "v1.5.1 — AI Follow-ups" 2026-04-25 "Bugfixes + Post-Trip-Analyse"
#
# Argumente:
#   $1  Milestone-Titel-Prefix (exact-match; verwende den vollen Titel)
#   $2  Release-Datum im Format YYYY-MM-DD
#   $3  Kurzinfo für die Description (max ~60 Zeichen empfohlen)

set -euo pipefail

REPO="stekum/roman-holiday-planner"

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 \"<milestone-titel-prefix>\" <release-datum-YYYY-MM-DD> <kurzinfo>" >&2
  echo "" >&2
  echo "Beispiel:" >&2
  echo "  $0 \"v1.5 — AI\" 2026-04-18 \"AI Features\"" >&2
  exit 1
fi

TITLE_PREFIX="$1"
RELEASE_DATE="$2"
SHORT_INFO="$3"

# Datums-Format validieren (YYYY-MM-DD)
if ! echo "$RELEASE_DATE" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
  echo "❌ Release-Datum muss Format YYYY-MM-DD haben (war: $RELEASE_DATE)" >&2
  exit 1
fi

# Milestone-Nummer über exakten Titel-Match finden
MILESTONE_NUM=$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --jq ".[] | select(.title == \"$TITLE_PREFIX\") | .number")

if [ -z "$MILESTONE_NUM" ]; then
  echo "❌ Kein Milestone mit Titel \"$TITLE_PREFIX\" gefunden." >&2
  echo "   Verfügbare Titel:" >&2
  gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[] | "   - \(.title)"' >&2
  exit 1
fi

echo "→ Finalisiere Milestone #$MILESTONE_NUM \"$TITLE_PREFIX\""
echo "  Release-Datum: $RELEASE_DATE"
echo "  Kurzinfo:      $SHORT_INFO"
echo ""

DESCRIPTION="✅ Released $RELEASE_DATE — $SHORT_INFO"
DUE_ON="${RELEASE_DATE}T12:00:00Z"

gh api -X PATCH "repos/$REPO/milestones/$MILESTONE_NUM" \
  -f state="closed" \
  -f due_on="$DUE_ON" \
  -f description="$DESCRIPTION" \
  --jq '{number, title, state, due_on, description}'

echo ""
echo "✅ Milestone #$MILESTONE_NUM finalisiert."
echo ""
echo "Verifikation: Roadmap-View öffnen — grüner Badge sollte neben dem Titel erscheinen:"
echo "  https://github.com/users/stekum/projects/1/views/5"
echo ""
echo "Falls kein grüner Badge: Browser-Reload. Falls immer noch nicht: Description-Format prüfen,"
echo "muss EXAKT mit '✅ Released YYYY-MM-DD' beginnen."
