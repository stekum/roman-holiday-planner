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

### Light (size:S, Bugfix, kleine Änderungen)

1. Branch erstellen: `git checkout -b fix/issue-N-beschreibung`
2. Projekt-Status auf "In Progress" setzen
3. Implementieren → `npm run build && npm run lint`
4. PR öffnen mit `Closes #N`
5. Direkt auf Production deployen (`npm run deploy`)
6. Issue schließen + Status auf Done

### Full (size:M/L, Features, user-facing Änderungen)

1. Prüfen ob Branch existiert: `git branch -r | grep issue-N`
2. Branch erstellen: `git checkout -b feat/issue-N-beschreibung`
3. Projekt-Status auf "In Progress" setzen
4. Implementieren → `npm run build && npm run lint`
5. **Playwright-Test** auf localhost (via Playwright MCP)
6. **Manuelles Testscript** in `e2e/manual/` erstellen
7. PR öffnen mit `Closes #N`
8. `npm run deploy:beta` → Stefan testet auf Beta
9. Nach Validierung: PR mergen + `npm run deploy` (Production)
10. **USER-GUIDE.md** aktualisieren (wenn user-facing)
11. Issue schließen + Status auf Done

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
