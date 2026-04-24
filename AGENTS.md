# Roman Holiday Planner — Project Context for AI Agents

Gemeinsames Briefing-Dokument für Codex CLI und Claude Code. Wird automatisch gelesen wenn du aus dem Projekt-Root arbeitest.

**Source of Truth für den Dev-Workflow.** Alles was beide Agents wissen müssen steht hier. Claude Code ergänzt in `CLAUDE.md` nur Claude-spezifische Shortcuts (Sub-Agents, Claude-only MCPs). Codex braucht diese Datei allein.

---

## Session Start Checklist

**Jeder Agent, Claude Code ODER Codex, bei jeder neuen Session:**

1. **Diese Datei lesen** (automatisch via AGENTS.md / CLAUDE.md Konvention).
2. **Git-State prüfen:** `git status && git log --oneline -5` — ist Working Tree clean, sind wir auf `main`, welche Commits sind zuletzt gelandet?
3. **Offene Arbeit prüfen:** `git branch -a | grep -E '(feat|fix)/'` — gibt es noch offene Feature/Fix-Branches aus einer vorherigen Session?
4. **Welche Issue?** Wenn der User eine Issue-Nummer nennt: `gh issue view N --repo stekum/roman-holiday-planner` — Status, Labels, Size lesen. Ist schon ein Branch offen? (`git branch -r | grep issue-N`)
5. **Agent-Koordination:** Wenn ein anderer Agent (Codex/Claude) an der gleichen Issue arbeitet → NICHT parallel anfangen. Stefan fragen.
6. **Workflow-Modus wählen** je nach Size: `size:S` → Light, `size:M/L` → Full. Siehe "Dev Workflow — zwei Modi".
7. **Release-Badge-Regression-Check** (30 Sekunden, verhindert stumme Regressionen):
   ```bash
   gh api graphql -f query='{ node(id: "PVTSSF_lAHOALePRc4BUPjLzhBirwI") { ... on ProjectV2SingleSelectField { options { name color description } } } }' \
     --jq '.data.node.options[] | select(.description | startswith("✅ Released")) | select(.color != "GREEN") | "REGRESSION: \(.name) \(.color) \(.description)"'
   ```
   Wenn Output NICHT leer: released Option hat Farbe verloren. Stefan sofort sagen, nicht stumm leiten. Fix via `./scripts/finalize-release.sh`.
8. **UI-Anomalie-Prinzip:** Bei „der Badge/Text/Farbe stimmt nicht" zuerst die Source-of-Truth des sichtbaren Elements tracen (Milestone vs. Project-Field-Option vs. Release-Tag vs. Custom-Field), BEVOR eine Mutation geschickt wird. Trace-first, Patch-second.
9. **Roadmap-Scope-Check** (Anti-Chaos, ab 2026-04-19): aktive Milestones dürfen max 5 Items haben. Dormant/opportunistische Milestones (v2.1, v4.0, v4.5) sind ausgenommen.
   ```bash
   for m in "v2.0 — Pre-Multi-Trip Foundation" "v3.0-beta — Multi-Trip Architektur" "v3.0 — Japan-Ready" "v3.1 — Trip Essentials post-Japan" "v3.2 — Multi-Trip-Polish vor Rom"; do
     c=$(gh issue list --repo stekum/roman-holiday-planner --milestone "$m" --state open --json number --jq 'length')
     if [ "$c" -gt 5 ]; then echo "⚠ $m: $c Items (>5)"; fi
   done
   ```
   Wenn Warnung: Stefan informieren, Split diskutieren. Niemals eigenmächtig Items hinzufügen/entfernen (Memory: feedback_projectv2_field_options).

10. **Board↔ROADMAP-Sync-Check** (harte Regel, ab 2026-04-20 — Memory: feedback_board_roadmap_sync): Stefan schaut primär auf den Project-Board Release-View. Board + ROADMAP müssen IMMER synchron sein. Jede Milestone-/Scope-Änderung ist ATOMIC über drei Stellen: GitHub-Milestone, Project-Board Release-Field, `docs/ROADMAP.md`.
    ```bash
    # Drift-Check: Issues mit Board-Release aber nicht in ROADMAP-Release-Sections (oder umgekehrt)
    for rel in v2.0 v2.1 v3.0-beta v3.0 v3.1 v3.2 v4.0 v4.5; do
      board_count=$(gh api graphql -f query='{ node(id: "PVT_kwHOALePRc4BUPjL") { ... on ProjectV2 { items(first:100) { nodes { content { ... on Issue { number state } } fieldValues(first:20) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } } } } }' \
        --jq --arg r "$rel" '[.data.node.items.nodes[] | select(.content.state == "OPEN") | select([.fieldValues.nodes[] | select(.field.name == "Release") | .name] | contains([$r]))] | length')
      roadmap_count=$(awk -v r="$rel" '/^## /{in_sec = ($0 ~ r "\\b")} /^\| #[0-9]+/ && in_sec {n++} END{print n+0}' docs/ROADMAP.md)
      if [ "$board_count" -ne "$roadmap_count" ]; then
        echo "⚠ DRIFT $rel: board=$board_count roadmap=$roadmap_count"
      fi
    done
    ```
    Wenn Drift: Stefan informieren. Niemals eigenmächtig auflösen ohne Bestätigung welche Seite richtig ist.

11. **Vor jedem Deploy:** siehe 🚨 HARTE REGEL "Niemals uncommitted deployen".

Dieser Check ist billig (≤60 Sekunden) und verhindert fast alle Klassen von Fehlern die wir bisher hatten.

---

## Was dieses Projekt ist

Eine **mobile-first kollaborative Trip-Planing-PWA** für eine gemeinsame Rom-Reise von zwei Familien. Solo entwickelt von Stefan Kummert — kein öffentliches Produkt.

- **Live (Prod):** https://holiday-planner.web.app/
- **Beta:** https://holiday-planner-beta.web.app/
- **Repo:** https://github.com/stekum/roman-holiday-planner
- **Sprache:** UI und Prompts auf Deutsch

> **Hosting-Transition aktiv (seit 2026-04-22, #117):** Firebase Hosting ist primär. GH-Pages (`stekum.github.io/roman-holiday-planner/beta/`) läuft parallel als Fallback bis ~2026-05-06 und wird dann via #213 abgeschaltet. Agents MÜSSEN gegen Firebase-URLs testen, nicht gegen die alte GH-Pages-URL.

---

## Tech Stack

| Technologie | Version | Rolle |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | ~6.0 | Typsicherheit (strict mode) |
| Vite | 8 | Build-Tool + Dev-Server |
| Tailwind CSS | v4 | Styling (CSS-first via `@theme` in `src/index.css`) |
| Firebase Firestore | 12 | Real-time geteilte Daten (POIs, Settings, Tagesplan) |
| Firebase Storage | 12 | Persistierte POI-Fotos |
| Firebase Functions | v2 | Cloud Function: `persistPoiPhoto` (europe-west1) |
| Firebase AI Logic | 12 | Gemini 2.5 Flash — serverseitig proxied, kein Client-Key |
| @vis.gl/react-google-maps | 1.x | Karte + Places API + Directions API |
| lucide-react | 1.x | Icons |
| Playwright | 1.x | E2E-Framework (installiert, noch keine Tests) |
| vite-plugin-pwa | 1.x | Service Worker + Web App Manifest |

**Wichtig:** Kein `tailwind.config.js` — Tailwind v4 wird CSS-first konfiguriert. Alle Design-Tokens stehen im `@theme`-Block in `src/index.css`.

---

## Projektstruktur

```
/
├── src/
│   ├── App.tsx                    Root: PasswordGate → APIProvider → AppInner (State-Hub)
│   ├── main.tsx
│   ├── index.css                  Tailwind v4 @theme Tokens (terracotta, olive, cream, ink, ocker)
│   ├── data/
│   │   └── pois.ts                POI-Typ, Category-Typ, SEED_POIS, ROME_CENTER
│   ├── settings/
│   │   ├── types.ts               Family, Homebase, Settings Interfaces
│   │   └── defaults.ts            DEFAULT_SETTINGS
│   ├── firebase/
│   │   ├── firebase.ts            Firebase-Init, getFirebase(), ensureAuth(), isFirebaseConfigured
│   │   └── useWorkspace.ts        ← ZENTRALER DATEN-HOOK (einziger Firestore-Zugang)
│   ├── hooks/
│   │   ├── useMyLocation.ts       Geolocation API
│   │   └── useWeather.ts          Wetter pro Tag
│   ├── lib/
│   │   ├── gemini.ts              Gemini via Firebase AI Logic (kein API-Key im Client)
│   │   ├── aiDayPlanner.ts        KI-Tagesplan-Generator (Gemini 2.5 Flash)
│   │   ├── dates.ts               eachDayInRange() + Datums-Utils
│   │   ├── geo.ts                 Distanz-Berechnung
│   │   ├── igMetadata.ts          Instagram og:metadata (via CORS-Proxy)
│   │   └── openingHours.ts        Öffnungszeiten-Formatierung
│   └── components/
│       ├── Header.tsx             Tab-Bar: Entdecken / Reise / Settings
│       ├── PasswordGate.tsx       SHA-256 Passwort-Check
│       ├── add/                   AddPoiMenu + Modals für 4 Hinzufüge-Flows
│       ├── dayplanner/            DayPlanner, DayTabs, RouteSummary, AiDayPlannerModal
│       ├── map/                   RomeMap.tsx, RoutePolyline.tsx
│       ├── poi/                   PoiList, PoiCard, EditPoiModal
│       └── settings/              SettingsView, FamilyEditor, HomebaseEditor, TripDatesEditor
├── functions/
│   └── index.js                   Cloud Function: persistPoiPhoto (Node.js, Firebase v2)
├── docs/
│   ├── USER-GUIDE.md              Benutzerhandbuch (alle Features, Workflows, Known Issues)
│   └── ROADMAP.md                 6-Wochen-Releaseplan (Source of Truth: GitHub Project Board)
├── e2e/
│   └── manual/                    Manuelle Testpläne pro Issue (nach jedem Fix/Feature erstellen)
├── firestore.rules                Firestore Security Rules (Produktion!)
├── storage.rules                  Storage Security Rules (Produktion!)
├── firebase.json
├── vite.config.ts
└── .env.local.example             Vollständige Env-Var-Referenz
```

---

## Environment Setup

### `.env.local` (gitignored — niemals committen!)

```bash
cp .env.local.example .env.local
# Dann Werte eintragen
```

Erforderliche Variablen:

```
VITE_APP_PASSWORD_SHA256=        # SHA-256 Hash des App-Passworts (optional, leer = kein Gate)
                                  # echo -n "passwort" | shasum -a 256

VITE_GOOGLE_MAPS_API_KEY=        # Google Maps JS API Key
                                  # Aktivieren: Maps JS API, Places API (classic), Directions API
                                  # HTTP-Referrer-Restriction: localhost:5173/* + *.github.io/*

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=       # z.B. roman-holiday-planner.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=        # z.B. roman-holiday-planner
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_WORKSPACE_ID=      # Shared Namespace (z.B. "roma2026"), default: "default"
```

**Gemini:** Kein `VITE_GEMINI_API_KEY` nötig. Gemini läuft über Firebase AI Logic (serverseitig). `.env.local.example` enthält noch den veralteten Eintrag — ignorieren.

**Für Code-Generierung:** `.env.local` wird nicht benötigt. `npm run build` und `npm run lint` funktionieren ohne es.

---

## Security

### Claude Code Deny Rules (#115)

`.claude/settings.json` enthält Deny-Permissions damit Claude Code keine Secrets liest und keine destruktiven Git-Operationen ohne Bestätigung ausführt:

- **Read-Deny:** `.env.local`, `.env.*.local`, `.env.production`, `functions/.env*`, `*-credentials.json`, `*.pem`, `*.key`, Service-Account-JSONs
- **Bash-Deny:** `git commit --no-verify`, `git push --force`, `git push --force-with-lease`

Wenn Claude Code versucht eine dieser Operationen auszuführen, wird die Aktion blockiert und muss manuell freigegeben werden. Neue Secrets/Credentials-Dateinamen ggf. ergänzen.

### Semgrep Pre-Commit Hook (#116)

Via [husky](https://typicode.github.io/husky/) eingerichtet — `npm install` aktiviert die Git-Hooks automatisch (`prepare`-Script).

**Der Hook (`.husky/pre-commit`)** läuft `semgrep --config auto --severity ERROR` über `src/`, die Firestore/Storage Rules und die Cloud Functions. Nur **High/Critical**-Findings blockieren den Commit — niedrigere Severity wird ignoriert um die Friction niedrig zu halten.

**Semgrep einmalig installieren:**

```bash
brew install semgrep
# Alternative:
# pipx install semgrep
```

**Graceful fallback:** Wenn Semgrep nicht installiert ist, skipped der Hook mit einer Install-Hint-Message (exit 0). Niemand wird durch first-time setup geblockt, aber jeder bekommt die Info dass er installieren soll.

**Manuell ausführen:**

```bash
semgrep --config auto --severity ERROR src/
```

**Hook bypassen** (sollte nur ausnahmsweise nötig sein): `git commit --no-verify` — aber das ist in `.claude/settings.json` als deny-rule hinterlegt, Claude Code wird das nicht selbst machen.

---

## Dev Commands

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Dev-Server: http://localhost:5173/roman-holiday-planner/
npm run build        # TypeScript-Check + Vite Production Build → dist/
npm run lint         # ESLint
npm run preview      # Production Build lokal vorschauen
npm run deploy       # Triggert "Deploy Firebase Prod" Workflow (manuelles Prod-Deploy)
# Beta-Deploy: KEINE Script-Action. Läuft automatisch bei Push auf main
# via .github/workflows/deploy-firebase-beta.yml
```

---

## Deployment-Workflow (Beta → Production)

**Stefan testet auf der deployten Beta, nicht auf localhost.** Lokales Testen (z.B. Playwright) ist ok, muss aber klar kommuniziert werden.

### Zwei Stufen (Firebase Hosting, primär)

| Stufe | URL | Trigger | Zweck |
|---|---|---|---|
| **Beta** | `https://holiday-planner-beta.web.app/` | Automatisch bei push auf `main` (`deploy-firebase-beta.yml`) | Testen nach jedem Fix |
| **Production** | `https://holiday-planner.web.app/` | Manuell via `gh workflow run deploy-firebase-prod.yml -f confirm=deploy-prod` | Stabile Version für alle Nutzer |

**Fallback bis ~2026-05-06:** GH-Pages-Beta läuft parallel unter `https://stekum.github.io/roman-holiday-planner/beta/` — NICHT primär verwenden, nur als Notfall-Backup bis #213 abgeschlossen ist.

### Dev Workflow — drei Stufen nach T-Shirt-Size

**Gemeinsame Regel:** Beta → Production. NIEMALS direkt nach Production (sonst out-of-sync).

**Lokales Testen ist OPTIONAL** — Stefan kann jederzeit `git pull && npm run dev` laufen lassen, muss aber nicht. Standard-Weg: Agent implementiert → PR → merge → **Auto-Beta-Deploy läuft** (`deploy-firebase-beta.yml`) → **Agent verifiziert via Playwright auf der Beta-URL** → Stefan testet auf Beta → `npm run deploy` (triggert Prod-Workflow). Local-Iteration macht vor allem bei size:L Sinn, wenn Deploy-Zyklus bremst.

**size:S — Light (Bugfix, CSS-Tweak, Copy-Change, Dependency-Bump):**
1. Branch + Implementieren + Build/Lint
2. PR merge
3. Auto-Beta-Deploy läuft nach dem Merge
4. Stefan smoke-testet auf Beta
5. Nach Validierung: `deploy` (Production)
6. Issue → Done (erst nach Stefan-Validierung)

**size:M — Standard (Feature mit UI-Änderung, neue Lib, neue API-Integration):**
1. Branch + Implementieren + Build/Lint
2. Manuelles Testscript in `e2e/manual/<issue>.md`
3. PR merge
4. Auto-Beta-Deploy läuft nach dem Merge
5. **Playwright-Smoke auf der Beta-URL** via Test-Auth-Scaffolding (#158):
   - Einmalige Einrichtung: Service-Account-JSON aus Firebase Console nach `./service-account.json` (gitignored) ODER `GOOGLE_APPLICATION_CREDENTIALS` setzen
   - Token minten: `npm run e2e:token` (erzeugt `.playwright-results/e2e-token.txt`, läuft 1h)
   - Test schreiben in `e2e/issue-<N>-<slug>.e2e.js`, Helper verwenden: `require('./auth-helper').getAuthenticatedContext(browser)`
   - Ausführen: `node e2e/issue-<N>-<slug>.e2e.js` (oder per `npm run e2e:issue-<N>`-Alias)
   - Screenshots landen in `.playwright-results/` (gitignored)
   - Agent reportet: "Happy Path grün, N Ergebnisse, Screenshots bei …" oder "Regression → Fix"
6. Stefan testet auf Beta
7. Nach Validierung: `deploy` (Production)
8. USER-GUIDE.md aktualisieren (wenn user-facing)
9. Issue → Done

**size:L — Deep Work (Multi-File-Refactor, Auth-Migration, Schema-Change, Daten-Migration):**
- Wie size:M, plus:
- Mid-Development-Local-Iteration (schneller als Deploy-Cycle für Debugging)
- Playwright mit erweiterten Szenarien (Happy + Fehler-Pfade + Edge Cases)
- Design-Check vor Implementation (kurzer Plan / Architektur-Skizze vor dem Schreiben)
- ROADMAP + USER-GUIDE Impact meist größer — beide müssen aktualisiert werden

### Releases

Releases werden **nicht** nach einzelnen Issues erstellt. Ein Release wird erst erstellt wenn **alle Issues einer Version** (z.B. v1.1) abgeschlossen sind:

```bash
gh release create v1.x.y --target main --generate-notes
```

### Wichtig

- **Beta** läuft automatisch bei jedem Push auf main, zielt auf separate Firebase-Hosting-Site (`holiday-planner-beta`)
- **Production** wird via `npm run deploy` (triggert den Workflow) oder direkt `gh workflow run "Deploy Firebase Prod"` deployed — nur wenn Beta validiert ist
- **KEIN direktes Production-Deploy ohne Beta mehr** (auch nicht bei size:S) — Ausnahme war zu risky
- Der Prod-Workflow builded aus dem ausgecheckten `main`-Branch in der Actions-Runtime — uncommitted local changes können nicht mehr in Prod landen (war der #14-Fußschuss)
- Playwright-Tests via `node -e` gegen die Beta-URL (nicht Desktop Commander, nicht localhost)

### 🚨 HARTE REGEL: Niemals uncommitted deployen

**Historischer Kontext (2026-04-23 und früher):** `npm run deploy` lief lokal mit `gh-pages`. Das bedeutete: der lokale Working Tree wurde gebaut und auf `gh-pages` branch gepusht — **auch uncommitted Änderungen**. Daraus wurde der #14-Incident: Feature nur auf Festplatte, nächster Deploy regredierte Prod.

**Seit 2026-04-24:** `npm run deploy` triggert den GitHub-Actions-Workflow "Deploy Firebase Prod". Der Workflow cloned den `main`-Branch frisch und builded dort. Uncommitted lokale Änderungen **können technisch nicht mehr** in Prod landen.

**Die Regel bleibt aber:**

> **Bevor `npm run deploy` ausgeführt wird, muss dein Feature-Branch gemerged und auf main sein. `git status` muss clean sein (außer `.claude/settings.json` Noise). Sonst passt das was du gerade bauen wolltest nicht zu dem was Prod bekommt.**

Konkret vor jedem Deploy:

```bash
git status                           # muss clean sein (außer settings.json)
git rev-parse HEAD                   # muss auf main zeigen
git diff origin/main..HEAD --stat    # muss leer sein (nichts un-pushed)
```

**Präzedenz:** #14 AI Tages-Briefing (April 2026) wurde gebaut und deployed ohne Commit. Source war nur im Working Tree. Recovery-PR #156 musste den Code retroaktiv in git bringen bevor der nächste Deploy Prod zerschossen hätte.

**Gilt für beide Agents (Claude Code + Codex) gleichermaßen.** Wenn ein Agent nicht selbst committen darf (z.B. Review-Modus), dann auch nicht deployen — sondern warten bis Stefan oder der andere Agent das committet.

---

## Agent-Zusammenarbeit (Claude Code + Codex)

Beide Agents arbeiten am selben Repo. Damit das nicht chaotisch wird:

### Aufgabenteilung (Richtlinie, keine Hartregel)

| Typ | Bevorzugter Agent | Warum |
|---|---|---|
| Issue-Triage, Labels, Project Board, Roadmap | Claude Code | GitHub-CLI + Kontext-schwere Ops, längerer Planning-Horizont |
| Architektur-Entscheidungen, Firestore-Datenmodell | Claude Code | Multi-File-Analyse + Begründungsbedarf |
| PR-Reviews des jeweils anderen Agents | Claude Code | Gegenlesen bevor Stefan merged |
| Fokussierte Implementierungen (size:S/M) | Codex | Schnell, fokussiert, gut für klar umrissene Features |
| Firebase Security Rules, Multi-File-Refactorings | Claude Code | Riskant, braucht Übersicht |
| Schnelle Bugfixes mit klarem Scope | beide | Wer zuerst da ist |

### Koordinationsregeln

1. **Nie zwei Agents auf demselben Branch.** Vor Start prüfen: `git branch -r | grep issue-N`.
2. **Ein Branch pro Issue.** Wenn Issue N schon einen Branch hat, entweder Stefan fragen oder ein anderes Issue nehmen.
3. **PRs von Codex können von Claude Code reviewed werden** bevor Stefan merged — das ist erwünscht.
4. **Commits:** Beide Agents committen direkt. Co-Authorship in Commit-Messages wenn gemeinsam gearbeitet wurde:
   ```
   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   Co-Authored-By: Codex (GPT-5) <noreply@openai.com>
   ```
5. **Deploys:** Wer deployed, übernimmt Verantwortung für git-clean-State (siehe 🚨 Harte Regel).

### Was jeder Agent liest

- **Claude Code:** `CLAUDE.md` → verweist auf diese `AGENTS.md` als SSoT. Zusätzlich: User-Global `~/.claude/CLAUDE.md` + Memory-Ordner pro Projekt.
- **Codex:** `AGENTS.md` direkt. Keine zusätzliche Projekt-Konfiguration.

Wenn Dev-Workflow-Regeln geändert werden: **immer in AGENTS.md**, nicht in CLAUDE.md. Sonst driften die Agents auseinander.

---

## Agentisches Testing — Chrome DevTools MCP (#190)

Ab Chrome 147 steht der [Chrome DevTools MCP Server](https://github.com/ChromeDevTools/chrome-devtools-mcp) bereit. Er erlaubt Agents, eine laufende Chrome-Instanz per DevTools-Protokoll zu inspizieren: Network-Requests, Console-Logs, Performance-Traces, Lighthouse-Audits, Memory-Snapshots — also alles was du sonst manuell in DevTools öffnen würdest, nur programmatisch.

**Wozu wir ihn nutzen:**
- Post-Deploy-Smoke-Checks auf Beta (bootet die App, gibt's Console-Errors, sind API-Calls im erwarteten Rahmen)
- Cache-Verifikation bei Performance-Issues (Directions/Places-Requests zählen)
- Lighthouse-Audit vor Releases (CWV, Accessibility, Best Practices)
- Live-Debugging wenn ein User ein reproduzierbares Problem beschreibt

**Wozu nicht:**
- Reproducible CI — dafür bleibt Playwright (siehe `e2e/*.e2e.js`). MCP braucht eine laufende Chrome-Instanz auf der Entwickler-Maschine, kein Headless-CI.
- Manuelle Akzeptanztests — dafür bleiben die `e2e/manual/*.md` Test-Scripts.

### Setup (einmalig)

**1. Chrome mit separatem Agent-Profil starten:**

```bash
./scripts/chrome-agent.sh              # öffnet Beta
./scripts/chrome-agent.sh https://...  # öffnet beliebige URL
```

Das Script verwendet ein isoliertes Profil unter `/tmp/chrome-agent-profile` — **nicht** dein persönliches Chrome-Profil. Dadurch sieht der Agent keine Cookies/Logins deiner Alltagsbrowser-Session.

Port ist Standard `9222` (override: `CHROME_AGENT_PORT=9223 ./scripts/chrome-agent.sh`).

**2. MCP-Server in Claude Code registrieren** (lokal, `.claude/settings.local.json` — NICHT committed):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

Alternativ das offizielle Plugin:

```
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp
```

**3. Claude Code neu starten** → Tools sollten als `chrome-devtools:*` auftauchen.

### Nutzung im Alltag

Beispiel-Prompt nach einem Beta-Deploy:

> Starte Chrome Agent (`./scripts/chrome-agent.sh`), navigiere zur Beta, prüfe: (1) keine Console-Errors, (2) Directions-API ≤3 Calls beim ersten Tag-Öffnen, (3) LCP unter 2.5s. Report-Format: Grün/Gelb/Rot pro Punkt, Details nur bei Problem.

### Sicherheit

- **Port 9222 ist lokal erreichbar von allem was auf deiner Maschine läuft.** Browser-Session abschließen wenn fertig.
- **Agent-Profil ist nicht dein persönliches Profil** — Logins die du in diesem Fenster machst bleiben im Agent-Profil (also ok für E2E-Test-Account, aber vermeide Prod-Admin-Logins dort).
- **`--browser-url=`-Modus** (oben) verhindert dass MCP neue Chrome-Instanzen spawnt — Agent bindet sich nur an die bestehende.

---

## Lessons Learned (Past Incidents)

Kurze Einträge. Regel → was war passiert → wie es vermieden wird.

### Uncommitted Code deployed (#14, April 2026)

- **Was passierte:** Feature-Branch lokal entwickelt, auf Beta + Production deployed, Source-Code aber nie committed. Bundle auf gh-pages korrekt, aber git-Historie leer. Nächster Deploy von main hätte Prod stillschweigend regrediert.
- **Regel:** Siehe 🚨 HARTE REGEL "Niemals uncommitted deployen".
- **Recovery:** PR #156 (retroaktiver Commit) + Rebuild/Verify Bundle-Hash identisch.

### ProjectV2 Field-Options regenerieren IDs

- **Was passierte:** `updateProjectV2Field` mit `singleSelectOptions` regeneriert intern ALLE Options-IDs, auch die nicht geänderten. Alle Release-Zuordnungen zu Issues waren weg.
- **Regel:** Bevor `singleSelectOptions` aktualisiert wird: Backup aller Item→Option-Zuordnungen mit neuen Titeln. Nach Update: Remap über Titel → neue ID → wieder zuweisen. Backup-jq MUSS `.id` auf Node-Level selektieren, nicht nur `.content`.

### Zombie-Anonymous-Sessions nach Auth-Migration

- **Was passierte:** Nach Migration von `signInAnonymously` zu Google OAuth blieben 36 anonyme Firebase-Auth-User übrig die aber keine User-Dokumente hatten → "?"-Einträge in Admin-UIs. Kein Race-Condition, sondern Alt-Daten.
- **Regel:** Nach Auth-Provider-Änderungen immer die Auth-User-Liste checken (`firebase auth:export` oder Firebase MCP `auth_get_users`) und alte Sessions aufräumen — nicht in der UI.

---

## Code-Konventionen

### TypeScript
- **Strict Mode:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`
- **`verbatimModuleSyntax` ist an** → immer `import type` für reine Typ-Imports
- Kein `any` ohne erklärenden Kommentar

### React & Komponenten
- Ausschließlich Funktionskomponenten mit Named Exports
- State und Logik co-located — kein State-Management-Framework
- Shared Hooks in `src/hooks/`, lokale Hooks direkt in der Komponente

### Tailwind v4
- Design-Tokens aus `src/index.css @theme`:
  - Farben: `terracotta`, `terracotta-dark`, `ocker`, `ocker-light`, `olive`, `olive-dark`, `cream`, `cream-dark`, `ink`
  - Fonts: `font-display` (Playfair Display — Headlines), `font-sans` (Inter — Body)
- Keine Klassen außerhalb des Design-Systems hinzufügen — bei Bedarf `@theme` in `index.css` erweitern

### Firebase / Firestore
- **Alles läuft über `useWorkspace()`** in `src/firebase/useWorkspace.ts` — niemals direkte Firebase-Imports in Komponenten
- `stripUndefined()` muss auf jedes Objekt angewendet werden, bevor es an Firestore geht (Firestore lehnt `undefined`-Werte ab)
- Fire-and-Forget-Writes mit `void updatePoi(...)` — der Firestore-Cache handhabt UI-Updates optimistisch
- Workspace-Struktur: `workspaces/{workspaceId}` (Settings + TripPlan) + Subcollection `workspaces/{workspaceId}/pois/{poiId}`

### KI / Gemini
- Zugriff ausschließlich über `getGeminiModel()` aus `src/lib/gemini.ts`
- Alle Prompts auf Deutsch
- KI-Antworten immer als nicht vertrauenswürdig behandeln — defensiv parsen, immer Fallbacks

---

## Branch & PR Konventionen

- `main` — production-ready, wird via `npm run deploy` (triggert Firebase-Prod-Workflow) deployed
- Feature-Branches: `feat/issue-N-kurzbeschreibung`
- Bug-Branches: `fix/issue-N-kurzbeschreibung`
- **Ein Branch pro Issue** — niemals zwei Issues auf demselben Branch
- PR-Titel: `feat(#N): Kurzbeschreibung` oder `fix(#N): Kurzbeschreibung`
- PR-Body immer mit `Closes #N` — dadurch schließt GitHub das Issue beim Merge automatisch
- Squash-Merge bevorzugt (saubere Main-History)
- **Niemals direkt auf `main` pushen** — immer via PR

---

## GitHub Project Board

- **URL:** https://github.com/users/stekum/projects/1
- **Project ID:** `PVT_kwHOALePRc4BUPjL`
- **Status-Field ID:** `PVTSSF_lAHOALePRc4BUPjLzhBZEAU`
  - Todo: `f75ad846`
  - In Progress: `47fc9ee4`
  - Done: `98236657`
- **Release-Field ID:** `PVTSSF_lAHOALePRc4BUPjLzhBirwI`
  - ⚠️ **Option-IDs NICHT hardcoden!** Sie regenerieren bei jeder Options-Aenderung.
  - Frisch abfragen mit: `gh api graphql -f query='query { node(id: "PVT_kwHOALePRc4BUPjL") { ... on ProjectV2 { field(name: "Release") { ... on ProjectV2SingleSelectField { options { id name } } } } } }'`
  - Options (Stand: regen am 2026-04-18, inkl. v1.5.1): v1.0, v1.1, v1.2, v1.5, v1.5.1, v2.0, v3.0-beta, v3.0, v4.0, v4.5
- **Start-Field ID:** `PVTF_lAHOALePRc4BUPjLzhBil4I` (Date)
- **Ziel-Field ID:** `PVTF_lAHOALePRc4BUPjLzhBil4M` (Date)
- **Cluster-Field ID:** `PVTSSF_lAHOALePRc4BUPjLzhBfLaw`
- **Labels:** `bug`, `bugfix`, `enhancement`, `ai`, `ux`, `infra`, `priority:high`, `priority:low`, `size:S`, `size:M`, `size:L`
- **Milestones:** `v1.0 — Pre-Trip`, `v1.5 — AI`, `v2.0 — Polish`, `v3.0 — Multi-Trip`, `v4.0 — App Stores`

Status wird manuell via `gh` CLI gesetzt (keine GitHub Actions Workflows aktiv).

### Neue Issues auf die Roadmap setzen

Bei jedem neuen Issue:
1. Issue erstellen mit Labels + Milestone
2. Ins Project Board einfuegen (`addProjectV2ItemById`)
3. **Release-Feld** setzen (welches Release?)
4. **Start/Ziel-Daten** setzen (welche Woche?)
5. `docs/ROADMAP.md` aktualisieren

---

## Release Management

### Versionsschema

SemVer mit produkt-spezifischer Interpretation:

| Format | Wann verwenden |
|---|---|
| `vX.Y.0` (Minor) | Neue Feature-Gruppe — AI-Features, Collab-Block, Polish-Sprint. Jeder thematisch zusammenhängende Milestone-Release ist ein Minor. |
| `vX.Y.Z` (Patch) | Bugfixes nach Release ODER vergessene Kleinigkeiten aus dem Minor (Follow-up-AI-Tweak, einzelne UX-Nachbesserung). Thematisch beim vorherigen Minor. |
| `vX.0.0` (Major) | Breaking Changes oder echte Architektur-Umstellung. v3.0 (Multi-Trip) ist der einzige geplante Major für dieses Projekt. |

Mehrere Releases pro Tag sind normal — jedes Patch bekommt eine eigene Version.

### Pre-Release-Checkliste

Vor `gh release create`:

1. **Alle geplanten Milestone-Issues abgeschlossen** oder explizit in einen späteren Milestone verschoben (siehe Leftover-Playbook unten)
2. **`main` = Prod:** der letzte Commit auf `main` ist auf Prod deployed (via `npm run deploy` / Firebase-Prod-Workflow, sichtbar in Firebase-Hosting-Release-History)
3. **Git clean:** `git status` zeigt nur erlaubtes `.claude/settings.json`-Rauschen
4. **Sanity-Check auf Prod:** zentrale Flows funktionieren (Entdecken-Tab, Reise-Tab, neue Features des Releases)
5. **ROADMAP.md synchron:** alle fertigen Issues des Releases sind mit `✅` markiert, das Release-Heading hat den Status-Marker vorbereitet
6. **USER-GUIDE.md aktualisiert** für alle user-facing Features dieses Releases

### Release-Ablauf (ab #173 — release-please-gesteuert)

1. **Fix/Feature** landet via PR auf `main` mit Conventional-Commit-Titel
   (`feat(#N):`, `fix(#N):`, `perf(#N):`, `docs:`, `refactor:`, `ci:`, …)
2. **Beta-Deploy** läuft automatisch (siehe #171)
3. **release-please-Action** aktualisiert / erstellt automatisch einen offenen
   **„Release PR"** auf `main` mit:
   - Version-Bump in `package.json` + `.release-please-manifest.json`
   - `CHANGELOG.md`-Eintrag aus den Commits seit letztem Tag (gruppiert nach
     `feat` / `fix` / `perf` / etc.)
   - PR-Body enthält Release-Notes in Markdown
4. **Validierung:** Playwright-Smoke + manueller Test auf Beta-URL
5. **Release-PR reviewen:**
   - Stimmt der vorgeschlagene Version-Bump? (`feat:` → minor, `fix:` → patch,
     `BREAKING CHANGE:` im Body → major)
   - Fehlt ein Eintrag? → Commit-Title fixen (neuer fixup-Commit oder amend + Re-Push)
6. **Release-PR mergen** → release-please setzt automatisch den Git-Tag,
   erstellt das GitHub-Release mit den Release-Notes, und markiert es als
   „Latest"
7. **Production-Deploy:** `npm run deploy` (bleibt manuell, siehe #173 non-goals)
8. **Post-Release-Checkliste** (siehe unten)

**Commit-Type Cheatsheet für release-please:**

| Prefix | Bump | Wann |
|---|---|---|
| `feat(#N):` | Minor | Neues Feature / neue Funktionalität |
| `fix(#N):` | Patch | Bugfix |
| `perf(#N):` | Patch | Performance-Optimierung |
| `docs:` | Patch | Nur Doku |
| `refactor:` | Patch | Refactoring ohne neue Funktion |
| `ci:` / `devops:` | Patch | CI / Infrastruktur |
| `chore:` | (ignoriert) | Interne Kleinigkeiten |
| `BREAKING CHANGE:` im Body | **Major** | Nur bewusst setzen (z.B. v3.0 Multi-Trip) |

### Post-Release-Checkliste

Nach `gh release create`. **Alle Punkte sind Pflicht — keiner ist optional außer explizit so markiert.**

1. **Release finalisieren über das Helper-Script** — einziger erlaubter Weg:
   ```bash
   # Argumente: <version> <release-datum> <kurzinfo>
   ./scripts/finalize-release.sh "v1.5.1" 2026-04-25 "AI Follow-ups"
   ```
   Das Script erledigt in einem Lauf atomisch:
   - GitHub-Milestone: `state=closed`, `due_on=<datum>T12:00:00Z`, `description=✅ Released <datum> — <kurzinfo>`
   - **ProjectV2 Release-Field-Option:** `color=GREEN`, `description=✅ Released <datum> — <kurzinfo>` — das ist die Quelle des grünen Badges in der Roadmap-View (NICHT `Milestone.description`, siehe Memory `feedback_release_badge_source_is_project_field.md`)
   - Automatischer Backup+Remap aller 100+ Items beim Option-Regen (GitHub hat keine in-place Option-Update-Mutation)
   - Assertion am Ende: Zielzustand verifiziert, sonst Exit 1
   - Eintrag in `docs/release-log.md` als Trail
   - Idempotent: mehrfach ausführbar, skipt wenn Zielzustand schon erreicht
   
   🚨 **Niemals** direkt `gh api graphql … updateProjectV2Field(singleSelectOptions: …)` aufrufen — regeneriert Option-IDs ohne Backup und zerschießt alle Item-Zuordnungen. Das Script ist die einzig sichere Variante.

2. **ROADMAP.md:** Release-Sektion bekommt `✅ Released YYYY-MM-DD` Marker im Heading UND eine einzeilige **Release:** mit Tag-Link + Datum (Format siehe v1.1/v1.2/v1.5-Sektionen).

3. **Verifikation in der Roadmap-View** (`https://github.com/users/stekum/projects/1/views/5`): grüner Badge `✅ Released YYYY-MM-DD — <Kurzinfo>` steht neben dem Milestone-Titel. Falls NEIN: Browser Cmd+Shift+R. Falls immer noch nicht: Script-Assertion hätte failed — Log prüfen.

4. **Optional:** Release-Announcement für Family & Friends (kurze Zusammenfassung der Highlights, siehe v1.5.0-Vorlage in Release-Notes).

### Leftover-Issues-Playbook

Wenn Milestone-Issues beim Release-Cut noch offen sind — drei Optionen:

| Option | Wann | Beispiel |
|---|---|---|
| **A: Patch-Release** `vX.Y.1` | 1–3 kleine Items, thematisch beim Minor | v1.5 → #16, #43 (AI-Features noch nicht gebaut) → neuer Milestone `v1.5.1 — AI Follow-ups` |
| **B: Slip zum nächsten Minor** | Items passen thematisch woanders besser | v1.5 → #123/#133/#137/#154 (Ops/Docs) → Milestone `v2.0 — Polish` |
| **C: Defer** | Item nicht mehr aktuell, später oder nie | Nach `## Deferred` in ROADMAP, Milestone auf nichts oder weit entfernt (v4.0) |

Entscheidung beim Cut treffen, nicht drumrum lavieren. Option A ist gut wenn man mental beim Minor bleiben will; Option B wenn ein Themenwechsel eh ansteht.

### Project Board Release-Feld ↔ GitHub-Milestone

**Konvention (aktualisiert 2026-04-18):**
- **Board Release-Feld** spiegelt **jeden Release-Tag** den wir tatsächlich released haben — inkl. Patches wie `v1.5.1`. Ohne saubere Patch-Option wirken Items in der Roadmap-View falsch gruppiert (alt unter v1.5 obwohl sie zu v1.5.1 gehören) → Stefan blickt dann nicht durch.
- **GitHub-Milestones** sind authoritativ — Board-Release-Feld folgt ihnen.
- Issue in `v1.5.1 — AI Follow-ups` Milestone bekommt Release-Feld `v1.5.1` auf dem Board.

**Wenn eine neue Release-Option auf dem Board fehlt** (z.B. v1.5.1, v2.0.1, …), Regen-Prozedur:

1. **Backup** aller Items mit ihrem aktuellen Release-Wert nach `/tmp/board-releases-backup.json` (paginiert, 100 pro Seite):
   ```bash
   gh api graphql -f query='query { node(id: "PVT_kwHOALePRc4BUPjL") { ... on ProjectV2 { items(first: 100) { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number } } fieldValues(first: 20) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } } } }' | jq '...'
   ```
2. **Regeneration** der kompletten Options-Liste (alle alten + neue). ALLE Option-IDs aendern sich.
3. **Neue IDs abfragen** (`query field options`), als Name→neue-ID Map persistieren.
4. **Remap-Loop** über alle Items: Old-Release-Name → New-ID via `updateProjectV2ItemFieldValue`. Shell-Script in Zsh (macOS bash 3.2 kein `declare -A`, also `case` statt assoc arrays).
5. **Verify:** 3 stichproben-Issues checken dass Milestone + Release konsistent.

Inzident-Memory beachten: bei der ersten Regen (v4.5 hinzugefuegt) ging ein Backup mit `null`-itemIds schief. Korrekte Query MUSS `id` auf Node-Level selektieren, nicht nur `content`. Das Script in diesem Ablauf macht das richtig.

### Rollback-Prozedur

Falls ein Production-Deploy Probleme macht:

```bash
# Schritt 1 (schnell, 1 Minute) — Firebase Hosting Rollback
# Firebase Console → Hosting → holiday-planner → Release-History
# älteren Build auswählen → "Rollback" klicken
# ODER via CLI:
firebase hosting:clone holiday-planner:live holiday-planner:live@vX.Y.Z

# Schritt 2: Fix im Code committen (neuer Commit auf main)

# Schritt 3: Patch-Release (release-please-PR mergen)
# Dann Prod-Deploy triggern:
npm run deploy
```

**Milestone-Handling:** Der Milestone des kaputten Release bleibt offen wenn der Fix noch dazu gehört; Release-Notes dokumentieren den Kontext.

---

## CI/CD — Aktueller Stand

Bewusst minimalistisch, dokumentiert damit's nicht als „wir haben CI vergessen" missverstanden wird. Stand 2026-04-18:

| Stufe | Automatisiert? | Wie heute |
|---|---|---|
| Pre-Commit Lint | ❌ | manuell `npm run lint` vor Commit |
| Pre-Commit Build | ❌ | manuell `npm run build` vor Commit |
| Pre-Commit Secret-Scan | ✅ (lokal) | Semgrep-Hook aus #116 |
| PR-CI (Build/Lint) | ❌ | Nicht eingerichtet — Agents machen es pro Commit |
| Beta-Deploy | ✅ (auto, #117) | automatisch via `.github/workflows/deploy-firebase-beta.yml` bei Push auf `main`. |
| Beta→Prod Gate | ✅ (menschlich) | Stefan testet auf Beta, gibt ok |
| Production-Deploy | ❌ | manuell `npm run deploy` |
| Release-Tag | ❌ | manuell `gh release create ... --generate-notes` |
| Milestone-Close | ❌ | manuell `gh api ... -X PATCH -f state=closed` |
| E2E-Tests (Playwright) | ❌ | auf Wunsch vom Entwickler lokal; kein Scheduler |

**Was das heisst:** Die gesamte Disziplin liegt beim jeweiligen Agent (Claude Code / Codex) und Stefan. Keine Automation fängt vergessenes Lint oder ungetesteten Deploy. Die harte Regel „Niemals uncommitted deployen" (siehe `## Deployment-Workflow`) ist deswegen so wichtig.

**Warum so minimalistisch:** Bis v2.0 ist das Projekt eine Familien-App, kein produktiv-kritisches System. Automation-Kosten (Einrichtung, Wartung, false positives) würden die Geschwindigkeit mehr bremsen als sie Qualität gewinnen. Sobald v3.0 Multi-Trip live geht, ist der Moment für Auto-Deploy + CI-Pipeline — dann sind auch Fremd-Workspaces betroffen.

**Parken als Future-Work** (siehe v2.0 Milestone):
- Issue „CI: GitHub Actions Build+Lint auf PR" (S)
- Issue „CI: Auto-Deploy Beta bei main-Merge" (M)
- Issue „CI: Playwright E2E im Pipeline" (L) — baut auf #158 auf
- Issue „CI: Semantic-Release (auto tag + notes)" (M)

Diese Issues werden angelegt sobald diese Sektion greift. Der Agent soll sie **nicht eigenmächtig umsetzen** — CI-Einführung ist eine bewusste Projekt-Entscheidung die Stefan trifft.

---

## Testing

### Mindestanforderung vor jedem PR

```bash
npm run build   # TypeScript-Fehler + Build-Fehler
npm run lint    # ESLint
```

### Playwright (automatisiert)

Playwright ist installiert. Für schnelle Validierung nach Fixes:

```bash
# Beispiel: Headless-Test auf deployed Beta-URL
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('rhp:unlocked', '1'); });
  const page = await ctx.newPage();
  await page.goto('https://holiday-planner-beta.web.app/', { waitUntil: 'domcontentloaded' });
  // ... Test-Logik + Screenshot ...
  await browser.close();
})();
"
```

**Wichtig:** PasswordGate muss per `sessionStorage.setItem('rhp:unlocked', '1')` via `addInitScript` umgangen werden.

### Manuelle Testpläne

Nach jedem Bug-Fix oder Feature wird ein manueller Testplan erstellt:

- Ablage: `e2e/manual/<issue-N>-<beschreibung>.md`
- Format: Vorbedingungen, Test-Cases mit Schritten + erwartetes Ergebnis
- Im Testplan angeben ob auf **Beta** oder **Production** getestet werden soll

---

## Bekannte Workarounds

### Google Maps AdvancedMarker — Visibility

`@vis.gl/react-google-maps` v1.8.x hat einen Bug: Marker werden beim React-Unmount nicht zuverlässig von der Karte entfernt. Weder `position={null}`, `className="hidden"`, noch React-Unmount-Cleanup funktionieren.

**Lösung:** `PoiMarker`-Komponente in `RomeMap.tsx` nutzt `useAdvancedMarkerRef()` + `useMap()` um direkt `marker.map = null` (verstecken) bzw. `marker.map = mapInstance` (zeigen) zu setzen. Das ist die einzige zuverlässige Methode.

### Homebase-Duplikation im AI Tagesplan

Gemini fügt manchmal die Unterkunft als Stop in den Tagesplan ein. Zwei Schutzschichten:
1. System-Prompt-Regel in `aiDayPlanner.ts`: _"Homebase darf NIEMALS als Stop erscheinen"_
2. Defensiver Filter in `App.tsx onAiAccept`: überspringt POIs die per placeId, Koordinaten oder Name zur Homebase passen

---

## Security — NIEMALS

- `.env.local` oder andere Dateien mit API-Keys committen
- API-Keys als Strings im Quellcode hardcoden
- `console.log` mit API-Keys oder Firebase-Config
- GitHub Actions Workflows ohne Diskussion mit Stefan ändern
- Direkt auf `main` pushen
- `firestore.rules` oder `storage.rules` lockern ohne Verständnis der Implikationen (schützen Produktionsdaten!)
- `npm run deploy` ohne vorherige Beta-Validierung ausführen
- `functions/` Struktur ohne Absprache ändern (Cloud Function läuft in Produktion)
