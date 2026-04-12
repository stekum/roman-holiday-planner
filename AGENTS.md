# Roman Holiday Planner — Project Context for AI Agents

Gemeinsames Briefing-Dokument für Codex CLI und Claude Code. Wird automatisch gelesen wenn du aus dem Projekt-Root arbeitest.

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
├── .github/                       (Workflows derzeit deaktiviert — Status wird manuell via gh CLI gesetzt)
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

### Ablauf nach jedem Fix / Feature

1. Code fertig → `npm run build && npm run lint` müssen grün sein
2. `npm run deploy:beta` — Beta-Deployment
3. Selbst mit Playwright auf Beta-URL validieren (headless)
4. Stefan mitteilen: _"Fix ist auf Beta deployed, bitte testen"_
5. Stefan validiert auf Beta
6. Wenn ok → `npm run deploy` (promoted zu Production)

### Wichtig

- `deploy:beta` nutzt `--add` → ersetzt nur den `beta/`-Ordner, Production bleibt unangetastet
- `deploy` ersetzt den **gesamten** gh-pages Branch → nur ausführen wenn Beta validiert ist
- Nie `deploy` ohne vorherige Beta-Validierung

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
- **Cluster-Field ID:** `PVTSSF_lAHOALePRc4BUPjLzhBfLaw`
- **Labels:** `bug`, `enhancement`, `ai`, `ux`, `priority:high`, `priority:low`, `size:S`, `size:M`, `size:L`
- **Milestones:** `v1.0 — Pre-Trip`, `v1.5 — AI`, `v2.0 — Polish`, `v3.0 — Multi-Trip`

Neue Issues werden automatisch via GitHub Actions ins Projekt eingefügt. Geschlossene Issues werden automatisch auf Done gesetzt.

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
