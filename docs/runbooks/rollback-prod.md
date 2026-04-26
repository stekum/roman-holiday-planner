# Runbook: Roll back Production deploy

**Wann nutzen:** Production (https://holiday-planner.web.app) zeigt einen Bug der durch den letzten Deploy entstanden ist. Du willst in <5 min zurück zur vorherigen Version, ohne erst zu debuggen.

**Wer:** Stefan oder ein Agent (Claude / Codex). Beide Optionen unten brauchen kein lokales Build und keinen `.env.local`.

---

## Option A — Firebase-Console-Rollback (schnellster Weg, ~30 Sekunden)

Firebase Hosting hält die letzten **10 Releases** automatisch vor — ein Klick reicht.

1. https://console.firebase.google.com/project/roman-holiday-planner-6ac48/hosting/sites/holiday-planner öffnen
2. Tab **„Release-History"**
3. Beim vorherigen grünen Release → **Drei-Punkte-Menü** → **„Rollback"** → bestätigen
4. Innerhalb von ~10 Sekunden zeigt Prod die alte Version
5. Stefan / Family informieren: „Prod ist temporär auf alten Stand zurückgerollt, Fix folgt."

**Verifikation:** `curl -sI https://holiday-planner.web.app/ | grep last-modified` — Datum sollte zur alten Version passen.

---

## Option B — GitHub Actions Re-Run (nimmt einen früheren Build)

Wenn die Firebase-Console nicht erreichbar ist oder du explizit einen bestimmten Commit deployen willst (älter als 10 Releases), nutze einen früheren Workflow-Run.

```bash
# 1. Liste der letzten Prod-Deploys
gh run list --repo stekum/roman-holiday-planner --workflow="Deploy Firebase Prod" --limit 10

# 2. Re-run eines bestimmten erfolgreichen Runs (das gleiche Commit wird neu gebaut + deployed)
gh run rerun <RUN_ID> --repo stekum/roman-holiday-planner

# 3. Status verfolgen
gh run watch <RUN_ID> --repo stekum/roman-holiday-planner --exit-status
```

**Wichtig:** Re-run baut aus dem **damaligen Commit** (workflow-checkout des SHA aus der Run-History). Heutige Bugs in main landen NICHT mit. Das ist genau was du beim Rollback willst.

---

## Option C — Lokaler Build aus früherem Git-Tag (Notfall, wenn Actions kaputt)

```bash
# 1. Tag identifizieren der vor dem Bug stable war
git tag --sort=-creatordate | head -5

# 2. Auschecken
git checkout v3.0.0  # Beispiel

# 3. Build
npm ci && VITE_BASE=/ npm run build

# 4. Direkt-Deploy mit lokalem Firebase-CLI
#    (braucht firebase login + Berechtigungen; service-account.json funktioniert nicht für Hosting-Deploys aus dem CLI)
firebase deploy --only hosting:prod --project roman-holiday-planner-6ac48

# 5. Zurück auf main
git checkout main
```

**Risiko:** Build kann je nach lokaler Node-Version anders ausfallen als der CI-Build. Nur als letzter Ausweg.

---

## Nach dem Rollback — Was als Nächstes

1. **Issue öffnen** für den Bug der den Rollback verursacht hat. Was war der letzte Commit auf main? `gh run view <broken-run-id>` zeigt den SHA.
2. **Beta wiederherstellen:** Beta auto-deployed bei jedem main-push. Wenn main weiter den Bug hat, ist Beta auch broken. Entweder:
   - Hotfix-Commit auf main → Beta auto-aktualisiert
   - Bug-Branch + Revert-Commit auf main
3. **Sobald Fix auf main ist + Beta validiert:** `npm run deploy` für reguläres Prod-Deploy.

---

## Was NICHT funktioniert (zur Klärung)

- ❌ `npm run deploy` mit ausgechecktem altem Commit → der Workflow checkt **immer main aus**, nicht deinen lokalen HEAD. Du würdest erneut den Bug deployen. Siehe `.github/workflows/deploy-firebase-prod.yml` Zeile mit `actions/checkout@v4`.
- ❌ `git revert` ohne anschließenden Deploy → main ist sauber, Prod läuft aber weiter mit dem Bug bis ein neuer Deploy geht.
- ❌ Firebase-Console-Rollback ohne main-Fix → main steht weiter auf dem Bug-Commit. Nächster regulärer Deploy bringt den Bug zurück. **Always pair Console-Rollback with a main-Fix oder Revert.**
