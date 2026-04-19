#!/usr/bin/env zsh
#
# finalize-release.sh — Einziger erlaubter Weg ein Release abzuschließen.
#
# Setzt atomisch:
#   1. GitHub Milestone: state=closed, due_on=<datum>T12:00:00Z, description="✅ Released <datum> — <kurzinfo>"
#   2. ProjectV2 Release-Field-Option: color=GREEN, description="✅ Released <datum> — <kurzinfo>"
#   3. Remap aller bestehenden Items nach dem Regen (updateProjectV2Field regeneriert IDs)
#   4. Assertion: post-update ist Option GREEN + description startsWith "✅ Released"
#   5. release-log.md Eintrag
#
# Hintergrund: Der grüne Release-Badge in der Project-Board Roadmap-View kommt aus der
# ProjectV2-Field-Option (color + description), NICHT aus der Milestone-Description.
# Memory: feedback_release_badge_source_is_project_field.md — Incident-Trail 2026-04-18.
#
# Usage:
#   ./scripts/finalize-release.sh "<version>" <release-datum> "<kurzinfo>"
#
# Beispiele:
#   ./scripts/finalize-release.sh "v1.5.1" 2026-04-25 "AI Follow-ups"
#   ./scripts/finalize-release.sh "v2.0"   2026-05-02 "Travel Essentials + CI/CD"
#
# Das Script ist idempotent: läuft es zweimal hintereinander, macht der zweite Lauf nichts
# (weil Milestone + Option bereits im Zielzustand sind).

set -euo pipefail

REPO="stekum/roman-holiday-planner"
PROJECT_ID="PVT_kwHOALePRc4BUPjL"
RELEASE_FIELD_ID="PVTSSF_lAHOALePRc4BUPjLzhBirwI"
REPO_ROOT="${0:A:h}/.."
RELEASE_LOG="${REPO_ROOT}/docs/release-log.md"

# --- Args -----------------------------------------------------------------

if [ "$#" -ne 3 ]; then
  cat >&2 <<EOF
Usage: $0 "<version>" <release-datum-YYYY-MM-DD> "<kurzinfo>"

Beispiel:
  $0 "v1.5.1" 2026-04-25 "AI Follow-ups"
EOF
  exit 1
fi

VERSION="$1"
RELEASE_DATE="$2"
SHORT_INFO="$3"

if ! echo "$RELEASE_DATE" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
  echo "❌ Release-Datum muss Format YYYY-MM-DD haben (war: $RELEASE_DATE)" >&2
  exit 1
fi

DESCRIPTION="✅ Released $RELEASE_DATE — $SHORT_INFO"
DUE_ON="${RELEASE_DATE}T12:00:00Z"

echo "→ Finalize Release"
echo "  Version:      $VERSION"
echo "  Release-Datum: $RELEASE_DATE"
echo "  Kurzinfo:     $SHORT_INFO"
echo "  Description:  $DESCRIPTION"
echo ""

# --- Step 1: Milestone patchen ---------------------------------------------

echo "[1/5] Suche Milestone mit Titel startswith \"$VERSION\"…"
MILESTONE_NUM=$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --jq ".[] | select(.title | startswith(\"$VERSION \") or . == \"$VERSION\" or startswith(\"$VERSION —\")) | .number" | head -1)

if [ -z "$MILESTONE_NUM" ]; then
  echo "❌ Kein Milestone mit Titel-Prefix \"$VERSION\" gefunden." >&2
  echo "   Verfügbare Titel:" >&2
  gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[] | "   - \(.title)"' >&2
  exit 1
fi

MILESTONE_CURRENT=$(gh api "repos/$REPO/milestones/$MILESTONE_NUM" --jq '{state, due_on, description}')
echo "  Milestone #$MILESTONE_NUM gefunden. Aktuell: $MILESTONE_CURRENT"

MILESTONE_CURRENT_DESC=$(echo "$MILESTONE_CURRENT" | jq -r '.description')
MILESTONE_CURRENT_STATE=$(echo "$MILESTONE_CURRENT" | jq -r '.state')
MILESTONE_CURRENT_DUE=$(echo "$MILESTONE_CURRENT" | jq -r '.due_on')

if [ "$MILESTONE_CURRENT_STATE" = "closed" ] && \
   [ "$MILESTONE_CURRENT_DESC" = "$DESCRIPTION" ] && \
   [ "$MILESTONE_CURRENT_DUE" = "${RELEASE_DATE}T00:00:00Z" ]; then
  echo "  ✓ Milestone bereits im Zielzustand, skip Patch."
else
  gh api -X PATCH "repos/$REPO/milestones/$MILESTONE_NUM" \
    -f state="closed" \
    -f due_on="$DUE_ON" \
    -f description="$DESCRIPTION" \
    --jq '{title, state, due_on, description}' > /dev/null
  echo "  ✓ Milestone gepatcht."
fi

# --- Step 2: Aktuelle Release-Field-Options holen --------------------------

echo ""
echo "[2/5] Aktuellen Zustand des Release-Felds holen…"
OPTIONS_JSON=$(gh api graphql -f query="{ node(id: \"$RELEASE_FIELD_ID\") { ... on ProjectV2SingleSelectField { options { id name color description } } } }" \
  --jq '.data.node.options')

# Check: existiert die Version als Option?
OPT_EXISTS=$(echo "$OPTIONS_JSON" | jq -r --arg v "$VERSION" 'map(select(.name == $v)) | length')
if [ "$OPT_EXISTS" = "0" ]; then
  echo "❌ Release-Field-Option \"$VERSION\" existiert nicht im Project Board." >&2
  echo "   Lege sie zuerst manuell in der UI an (Project Settings → Fields → Release → New option)." >&2
  echo "   Dann Script erneut starten." >&2
  exit 1
fi

# Check: ist die Option bereits im Zielzustand?
OPT_CURRENT=$(echo "$OPTIONS_JSON" | jq -r --arg v "$VERSION" '.[] | select(.name == $v) | "\(.color)|\(.description)"')
OPT_CURRENT_COLOR="${OPT_CURRENT%%|*}"
OPT_CURRENT_DESC="${OPT_CURRENT#*|}"

if [ "$OPT_CURRENT_COLOR" = "GREEN" ] && [ "$OPT_CURRENT_DESC" = "$DESCRIPTION" ]; then
  echo "  ✓ Release-Option bereits im Zielzustand (GREEN + \"$DESCRIPTION\")."
  echo "  ✓ Alles fertig — kein Regen nötig. Idempotent-Skip."
  # Log-Eintrag nachziehen falls fehlt (idempotent)
  if ! grep -q "$VERSION " "$RELEASE_LOG" 2>/dev/null; then
    mkdir -p "$(dirname "$RELEASE_LOG")"
    [ -f "$RELEASE_LOG" ] || echo "# Release Log\n" > "$RELEASE_LOG"
    echo "- $RELEASE_DATE · $VERSION · $SHORT_INFO · verified GREEN" >> "$RELEASE_LOG"
    echo "  ✓ release-log.md Eintrag nachgetragen."
  fi
  exit 0
fi

echo "  Aktuell: color=$OPT_CURRENT_COLOR · description=\"$OPT_CURRENT_DESC\""

# --- Step 3: Backup aller Item-Release-Zuordnungen -------------------------

echo ""
echo "[3/5] Backup aller Item-Release-Zuordnungen (paginiert)…"
BACKUP_FILE="/tmp/release-backup-$(date +%s).json"
TMP_PAGE=$(mktemp)

CURSOR=""
PAGE_NUM=1
echo "[]" > "$BACKUP_FILE"
while true; do
  if [ -z "$CURSOR" ]; then
    QUERY="{ node(id: \"$PROJECT_ID\") { ... on ProjectV2 { items(first: 100) { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number } ... on PullRequest { number } } fieldValues(first: 20) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } } } } }"
  else
    QUERY="{ node(id: \"$PROJECT_ID\") { ... on ProjectV2 { items(first: 100, after: \"$CURSOR\") { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number } ... on PullRequest { number } } fieldValues(first: 20) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } } } } }"
  fi
  echo "$QUERY" > "$TMP_PAGE.query"
  gh api graphql -F query=@"$TMP_PAGE.query" > "$TMP_PAGE"

  PAGE_COUNT=$(jq '[.data.node.items.nodes[] | {itemId: .id, release: ((.fieldValues.nodes[] | select(.field.name == "Release") | .name) // null)} | select(.release != null)] | length' "$TMP_PAGE")
  echo "  Seite $PAGE_NUM: $PAGE_COUNT Items mit Release-Wert"

  # Merge in Backup
  jq -s '[.[0] + [.[1].data.node.items.nodes[] | {itemId: .id, release: ((.fieldValues.nodes[] | select(.field.name == "Release") | .name) // null)} | select(.release != null)]] | .[0]' "$BACKUP_FILE" "$TMP_PAGE" > "$BACKUP_FILE.tmp" && mv "$BACKUP_FILE.tmp" "$BACKUP_FILE"

  HAS_NEXT=$(jq -r '.data.node.items.pageInfo.hasNextPage' "$TMP_PAGE")
  CURSOR=$(jq -r '.data.node.items.pageInfo.endCursor' "$TMP_PAGE")
  [ "$HAS_NEXT" != "true" ] && break
  PAGE_NUM=$((PAGE_NUM + 1))
done
rm -f "$TMP_PAGE" "$TMP_PAGE.query"

TOTAL_BACKED_UP=$(jq 'length' "$BACKUP_FILE")
echo "  ✓ Backup: $TOTAL_BACKED_UP Items → $BACKUP_FILE"

# --- Step 4: Neue Options-Liste bauen + Regen ------------------------------

echo ""
echo "[4/5] Options-Liste regenerieren (target: $VERSION → GREEN + neue Description)…"

# Options-Array bauen — alle alten Options übernehmen, nur target modifizieren
NEW_OPTIONS=$(echo "$OPTIONS_JSON" | jq --arg v "$VERSION" --arg desc "$DESCRIPTION" '
  map(if .name == $v then {name: .name, color: "GREEN", description: $desc} else {name: .name, color: .color, description: .description} end)
')

# GraphQL-Options-Literal aus JSON bauen mit @json für proper Escaping
# (JSON-String-Syntax ist kompatibel mit GraphQL-String-Syntax)
OPTIONS_LITERAL=$(echo "$NEW_OPTIONS" | jq -r '
  map("{name: \(.name|@json), color: \(.color), description: \(.description|@json)}")
  | join(", ")
  | "[\(.)]"
')

REGEN_QUERY=$(cat <<EOF
mutation {
  updateProjectV2Field(input: {
    fieldId: "$RELEASE_FIELD_ID"
    singleSelectOptions: $OPTIONS_LITERAL
  }) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        options { id name color description }
      }
    }
  }
}
EOF
)

REGEN_QUERY_FILE="/tmp/regen-query-$(date +%s).graphql"
echo "$REGEN_QUERY" > "$REGEN_QUERY_FILE"

REGEN_RESULT=$(gh api graphql -F query=@"$REGEN_QUERY_FILE")
NEW_OPTIONS_MAP=$(echo "$REGEN_RESULT" | jq '.data.updateProjectV2Field.projectV2Field.options | map({(.name): .id}) | add')
echo "  ✓ Regen durch. Neue Option-IDs:"
echo "$REGEN_RESULT" | jq -r '.data.updateProjectV2Field.projectV2Field.options[] | "    \(.name) = \(.id)"'

# --- Step 5: Remap aller Items --------------------------------------------

echo ""
echo "[5/5] Remap $TOTAL_BACKED_UP Items auf neue Option-IDs…"

FAILED=0
MAPPED=0
for ROW in $(jq -c '.[]' "$BACKUP_FILE"); do
  ITEM_ID=$(echo "$ROW" | jq -r '.itemId')
  OLD_RELEASE=$(echo "$ROW" | jq -r '.release')
  NEW_ID=$(echo "$NEW_OPTIONS_MAP" | jq -r --arg k "$OLD_RELEASE" '.[$k] // empty')

  if [ -z "$NEW_ID" ]; then
    echo "  ⚠  Keine neue ID für Release-Name \"$OLD_RELEASE\" (item=$ITEM_ID)" >&2
    FAILED=$((FAILED + 1))
    continue
  fi

  gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$o:String!) { updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){ projectV2Item { id } } }' \
    -f p="$PROJECT_ID" -f i="$ITEM_ID" -f f="$RELEASE_FIELD_ID" -f o="$NEW_ID" > /dev/null 2>&1 || {
    echo "  ⚠  Mutation failed für item=$ITEM_ID release=$OLD_RELEASE" >&2
    FAILED=$((FAILED + 1))
    continue
  }
  MAPPED=$((MAPPED + 1))
  printf "\r  mapped: %d/%d" "$MAPPED" "$TOTAL_BACKED_UP"
done
echo ""
echo "  ✓ Remap: $MAPPED erfolgreich, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
  echo "❌ $FAILED Items konnten nicht remapped werden. Backup: $BACKUP_FILE" >&2
  exit 1
fi

# --- Assertion: Target-Option ist GREEN + korrekte Description -------------

echo ""
echo "→ Assertion: verifiziere target-Option state…"
VERIFY=$(gh api graphql -f query="{ node(id: \"$RELEASE_FIELD_ID\") { ... on ProjectV2SingleSelectField { options { name color description } } } }" \
  | jq -r --arg v "$VERSION" '.data.node.options[] | select(.name == $v) | "\(.color)|\(.description)"')

V_COLOR="${VERIFY%%|*}"
V_DESC="${VERIFY#*|}"

if [ "$V_COLOR" != "GREEN" ]; then
  echo "❌ ASSERTION FAILED: target-Option color=$V_COLOR, expected GREEN" >&2
  exit 1
fi
if [ "$V_DESC" != "$DESCRIPTION" ]; then
  echo "❌ ASSERTION FAILED: target-Option description=\"$V_DESC\", expected \"$DESCRIPTION\"" >&2
  exit 1
fi

echo "  ✓ Option \"$VERSION\": color=GREEN, description=\"$V_DESC\""

# --- release-log.md Eintrag -----------------------------------------------

mkdir -p "$(dirname "$RELEASE_LOG")"
if [ ! -f "$RELEASE_LOG" ]; then
  cat > "$RELEASE_LOG" <<EOF
# Release Log

Append-only Log aller Release-Finalisierungen. Wird von \`scripts/finalize-release.sh\`
beim erfolgreichen Abschluss geschrieben. Dient als Verifikations-Trail gegen
Regressionen (Release-Field-Option verlor Farbe/Description).

EOF
fi
echo "- $RELEASE_DATE · $VERSION · $SHORT_INFO · verified GREEN" >> "$RELEASE_LOG"
echo "  ✓ release-log.md aktualisiert"

echo ""
echo "✅ Release \"$VERSION\" finalisiert."
echo ""
echo "Verifikation im Browser (Cmd+Shift+R):"
echo "  https://github.com/users/stekum/projects/1/views/5"
echo ""
echo "Grüner Badge neben \"$VERSION\" mit Text \"$DESCRIPTION\" sollte sichtbar sein."
