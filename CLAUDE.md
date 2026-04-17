# Roman Holiday Planner — Claude Code Context

**FIRST ACTION:** [AGENTS.md](./AGENTS.md) lesen — dort steht die **Session Start Checklist** und der gesamte Dev-Workflow (gilt für Claude Code UND Codex). Dieses Dokument enthält nur Claude-spezifische Ergänzungen.

AGENTS.md ist Single Source of Truth für:
- Projekt-Kontext, Tech Stack, Dateistruktur, Env-Setup
- Dev Workflow (Light/Full), Deploy-Regeln, 🚨 Harte Regel gegen uncommitted Deploys
- Code-/Branch-/PR-Konventionen, GitHub Project Board IDs
- Agent-Zusammenarbeit mit Codex, Lessons Learned

Wenn sich **Dev-Workflow-Regeln** ändern: in AGENTS.md editieren, nicht hier — sonst drift zwischen Agents.

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

> **Dev-Workflow (S/M/L Staffelung, Deploy-Regeln, Playwright-Scaffolding, Release-Prozess, Codex-Koordination) steht vollständig in [AGENTS.md](./AGENTS.md).** Nichts davon hier duplizieren — sonst drift.
