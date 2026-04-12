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

## Workflow beim Start einer Issue

1. Prüfen ob Branch existiert: `git branch -r | grep issue-N`
2. Falls ja → nicht nochmal starten, ggf. existierenden PR reviewen
3. Branch erstellen: `git checkout -b feat/issue-N-beschreibung`
4. Projekt-Status auf "In Progress" setzen (via GraphQL, s.o.)
5. Implementieren, dann: `npm run build && npm run lint` müssen grün sein
6. PR öffnen mit `Closes #N` im Body
7. Nach Merge: Issue schließt automatisch → GitHub Actions setzt Status auf Done

---

## Hinweis: Zusammenspiel mit Codex

Dieses Projekt wird auch mit Codex CLI bearbeitet. Immer zuerst prüfen:
- Gibt es schon einen offenen Branch/PR für die gewünschte Issue? → `git branch -r | grep issue-N`
- Nie zwei Agents auf demselben Branch gleichzeitig

Claude Code ist bevorzugt für Architektur-/Review-Aufgaben, Codex für fokussierte Implementierungen (size:S/M).
