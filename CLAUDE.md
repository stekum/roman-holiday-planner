# Roman Holiday Planner — Claude Code Context

Für vollständigen Projekt-Kontext, Tech Stack, Dateistruktur, Env-Setup, Code-Konventionen, Branch-Konventionen und Security-Regeln → **[AGENTS.md](./AGENTS.md) lesen.**

Dieses Dokument enthält nur Claude-Code-spezifische Ergänzungen.

---

## Claude Code Stärken in diesem Projekt

Claude Code bevorzugen für:
- **GitHub-Ops:** Issue-Triage, Labels, Milestones, Project Board via `gh` CLI
- **Multi-File-Analyse:** Bug-Diagnose die mehrere Dateien umfasst
- **Architektur-Entscheidungen:** Firestore-Datenmodell, neue Feature-Konzepte
- **PR-Reviews:** Codex-PRs gegenlesen bevor Stefan merged
- **Refactoring:** Wenn Änderungen viele Dateien gleichzeitig betreffen
- **Firebase Security Rules:** Änderungen an `firestore.rules` / `storage.rules`

---

## GitHub CLI — Wichtige Befehle

```bash
# Issues anzeigen
gh issue list --repo stekum/roman-holiday-planner
gh issue view 8 --repo stekum/roman-holiday-planner

# Branch für Issue erstellen und auschecken
git checkout -b fix/issue-8-kurzbeschreibung

# PR erstellen
gh pr create --repo stekum/roman-holiday-planner \
  --title "fix(#8): Kurzbeschreibung" \
  --body "$(cat <<'EOF'
## Änderungen
- ...

Closes #8
EOF
)"

# PR diff ansehen
gh pr diff 42 --repo stekum/roman-holiday-planner

# Projekt-Status auf "In Progress" setzen (Issue-Item-ID zuerst ermitteln)
gh api graphql -f query='
  query($issueId: ID!) {
    node(id: $issueId) {
      ... on Issue {
        projectItems(first: 5) {
          nodes { id project { id } }
        }
      }
    }
  }' -f issueId="ISSUE_NODE_ID" \
  --jq '.data.node.projectItems.nodes[] | select(.project.id == "PVT_kwHOALePRc4BUPjL") | .id'

# Dann Status setzen:
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId itemId: $itemId
      fieldId: $fieldId value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }' \
  -f projectId="PVT_kwHOALePRc4BUPjL" \
  -f itemId="ITEM_ID" \
  -f fieldId="PVTSSF_lAHOALePRc4BUPjLzhBZEAU" \
  -f optionId="47fc9ee4"  # In Progress
  # optionId="f75ad846"   # Todo
  # optionId="98236657"   # Done
```

---

## Dev Workflow — zwei Modi

**Gemeinsame Regel (BEIDE Modi):** Jeder Fix geht erst nach Beta, dann nach Production. NIEMALS direkt nach Production — sonst sind Beta und Production out-of-sync.

### Light (size:S, Bugfix, kleine Änderungen)

1. Branch: `git checkout -b fix/issue-N-beschreibung`
2. Projekt-Status → "In Progress"
3. Implementieren → `npm run build && npm run lint`
4. PR öffnen mit `Closes #N`, merge (squash)
5. `npm run deploy:beta` → Stefan testet
6. Nach Validierung: `npm run deploy` → Production
7. Projekt-Status → "Done"

### Full (size:M/L, Features, user-facing Änderungen)

1. Branch: `git checkout -b feat/issue-N-beschreibung`
2. Projekt-Status → "In Progress"
3. Implementieren → `npm run build && npm run lint`
4. **Playwright-Test** via MCP, Screenshots in `.playwright-results/`
5. **Manuelles Testscript** in `e2e/manual/` erstellen
6. PR öffnen mit `Closes #N`, merge (squash)
7. `npm run deploy:beta` → Stefan testet auf Beta
8. Nach Validierung: `npm run deploy` → Production
9. **USER-GUIDE.md** aktualisieren (wenn user-facing)
10. Projekt-Status → "Done"

**Wichtig:**
- Issues auf "Done" erst **nach Stefan-Validierung auf Beta**, nicht nach Deploy
- Playwright-Screenshots gehen nach `.playwright-results/` (gitignored), nicht in `/tmp/`

### Release erstellen (nur bei komplettem Meilenstein)

Releases werden **nicht** nach einzelnen Issues erstellt, sondern erst wenn **alle Issues eines Release** (v1.1, v1.2, etc.) abgeschlossen sind:

```bash
gh release create v1.x.y --target main --generate-notes --title "v1.x.y — Beschreibung"
```

**Neue Issues:** Immer Release-Feld + Start/Ziel-Daten im Project Board setzen + `docs/ROADMAP.md` aktualisieren (siehe AGENTS.md → "Neue Issues auf die Roadmap setzen")

---

## Hinweis: Zusammenspiel mit Codex

Dieses Projekt wird auch mit Codex CLI bearbeitet. Immer zuerst prüfen:
- Gibt es schon einen offenen Branch/PR für die gewünschte Issue? → `git branch -r | grep issue-N`
- Nie zwei Agents auf demselben Branch gleichzeitig

Claude Code ist bevorzugt für Architektur-/Review-Aufgaben, Codex für fokussierte Implementierungen (size:S/M).
