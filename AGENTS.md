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
7. **Vor jedem Deploy:** siehe 🚨 HARTE REGEL "Niemals uncommitted deployen".

Dieser Check ist billig (≤30 Sekunden) und verhindert fast alle Klassen von Fehlern die wir bisher hatten.

---

## Was dieses Projekt ist

Eine **mobile-first kollaborative Trip-Planing-PWA** für eine gemeinsame Rom-Reise von zwei Familien. Solo entwickelt von Stefan Kummert — kein öffentliches Produkt.

- **Live:** https://stekum.github.io/roman-holiday-planner/
- **Beta:** https://stekum.github.io/roman-holiday-planner/beta/
- **Repo:** https://github.com/stekum/roman-holiday-planner
- **Sprache:** UI und Prompts auf Deutsch

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
npm run deploy:beta  # Build + Deploy nach /beta/ (zum Testen)
npm run deploy       # Build + Deploy nach / (Production — nur nach Beta-Validierung!)
```

---

## Deployment-Workflow (Beta → Production)

**Stefan testet auf GitHub Pages, nicht auf localhost.** Lokales Testen (z.B. Playwright) ist ok, muss aber klar kommuniziert werden.

### Zwei Stufen

| Stufe | URL | Script | Zweck |
|---|---|---|---|
| **Beta** | `https://stekum.github.io/roman-holiday-planner/beta/` | `npm run deploy:beta` | Testen nach jedem Fix |
| **Production** | `https://stekum.github.io/roman-holiday-planner/` | `npm run deploy` | Stabile Version für alle Nutzer |

### Dev Workflow — zwei Modi

**Gemeinsame Regel:** Beta → Production. NIEMALS direkt nach Production (sonst out-of-sync).

**Light (size:S, Bugfix):**
1. Branch + Implementieren + Build/Lint
2. PR merge
3. `deploy:beta` → Stefan testet
4. Nach Validierung: `deploy` (Production)
5. Issue → Done (erst nach Stefan-Validierung)

**Full (size:M/L, Feature):**
1. Branch + Implementieren + Build/Lint
2. Playwright-Test via MCP, Screenshots nach `.playwright-results/`
3. Manuelles Testscript in `e2e/manual/`
4. PR merge
5. `deploy:beta` → Stefan testet auf Beta
6. Nach Validierung: `deploy` (Production)
7. USER-GUIDE.md aktualisieren (wenn user-facing)
8. Issue → Done

### Releases

Releases werden **nicht** nach einzelnen Issues erstellt. Ein Release wird erst erstellt wenn **alle Issues einer Version** (z.B. v1.1) abgeschlossen sind:

```bash
gh release create v1.x.y --target main --generate-notes
```

### Wichtig

- `deploy:beta` nutzt `--add` → ersetzt nur den `beta/`-Ordner, Production bleibt unangetastet
- `deploy` ersetzt den **gesamten** gh-pages Branch → nur ausführen wenn Beta validiert ist
- Light-Workflow: direktes Production-Deploy ohne Beta ist ok bei size:S
- Playwright-Tests laufen über Playwright MCP (nicht Desktop Commander)

### 🚨 HARTE REGEL: Niemals uncommitted deployen

**`npm run build` und `npm run deploy*` arbeiten aus dem Working Tree** — sie kümmern sich nicht darum ob die Dateien committed sind. Das ist ein Fußschuss der Prod stillschweigend regredieren lässt.

**Warum das kritisch ist:**
1. Du änderst lokal Dateien (ohne commit)
2. `npm run deploy` baut aus dem Working Tree und pusht das Bundle auf gh-pages
3. Beta/Prod funktionieren → sieht alles gut aus
4. **Source-Code existiert nur noch auf deiner Festplatte**
5. Nächster `npm run deploy` von main (z.B. nach einem anderen Fix) baut aus main (ohne den Code) → Bundle ohne Feature → **Production-Regression ohne Warnung**

**Die Regel:**

> **Bevor `npm run deploy:beta` oder `npm run deploy` ausgeführt wird, MUSS der gesamte Feature-Code committed, gepusht und nach main gemerged sein. `git status` muss clean sein (außer `.claude/settings.json` Noise).**

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

- `main` — production-ready, wird via `npm run deploy` auf GitHub Pages deployed
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
  - v1.1: `569b9bc8` | v1.2: `3708b2e2` | v1.5: `ca68f362`
  - v2.0: `d8772cc2` | v3.0-beta: `aab63fe0` | v3.0: `a7336ff1`
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

### Versionierung (Semantic Versioning)

```
v1.2.0   ← Minor: neues Feature
v1.2.1   ← Patch: Bug-Fix
v2.0.0   ← Major: Breaking Changes (unwahrscheinlich bei diesem Projekt)
```

Mehrere Releases pro Tag sind normal — jedes Patch bekommt eine eigene Version.

### Release-Ablauf

1. **Fix/Feature** landet via PR auf `main`
2. **Beta-Deploy:** `npm run deploy:beta`
3. **Validierung:** Playwright + manueller Test auf Beta-URL
4. **Release erstellen:**
   ```bash
   # Aktuelle Version ermitteln
   gh release list --limit 1
   
   # Neues Release mit auto-generiertem Changelog aus PR-Titeln
   gh release create v1.x.y --target main --generate-notes --title "v1.x.y — Kurzbeschreibung"
   ```
5. **Production-Deploy:** `npm run deploy`

### Was ein GitHub Release enthält

- **Git-Tag** auf dem exakten Commit
- **Auto-Changelog** aus allen PRs seit dem letzten Release
- **Übersicht:** `https://github.com/stekum/roman-holiday-planner/releases`

### Rollback

Falls ein Production-Deploy Probleme macht:
```bash
# Alten Release-Tag auschecken
git checkout v1.2.0
npm run build
npm run deploy
git checkout main
```

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
  await page.goto('https://stekum.github.io/roman-holiday-planner/beta/', { waitUntil: 'domcontentloaded' });
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
