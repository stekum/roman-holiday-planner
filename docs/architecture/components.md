# Architecture: React Components & State

## Top-Level Hierarchy

```
<App>
 └── <AuthGate>                           Firebase-Auth + Approval-Check
      └── <AppInner>                      Main-Container (hinter Auth)
           ├── <APIProvider>              Google-Maps-Context
           │    ├── <Header>              Tab-Navigation
           │    ├── <HomebasePhotoSync>   Render-less: lädt Homebase-Photo
           │    │
           │    ├── {tab === 'entdecken'}
           │    │    ├── <PoiList>        Scrollable POI-Liste mit Filter
           │    │    │    └── <PoiCard>   Einzel-Karte mit AiSuggestionsPanel
           │    │    └── <RomeMap>        Karte mit Pins
           │    │
           │    ├── {tab === 'reise'}
           │    │    └── <DayPlanner>     Day-Tabs + Stops + AI-Features
           │    │         ├── <DayTabs>
           │    │         ├── <RouteSummary>
           │    │         ├── <AiDayPlannerModal>
           │    │         ├── <AiKidFriendlyPanel>
           │    │         ├── <AiPostTripPanel>
           │    │         └── <DayBudgetCard>
           │    │
           │    ├── {tab === 'settings'}
           │    │    └── <SettingsView>   Trip-Config + Family-Mgmt + Admin
           │    │
           │    └── <AddPoiMenu>          FAB + Bottom-Sheet mit Add-Flows
           │         ├── <AddFromSearch>
           │         ├── <AddFromAiSearch> (Vibes-Suche via Gemini)
           │         ├── <AddFromMap>
           │         ├── <AddManual>
           │         └── <AddFromInstagram>
           │
           └── <LocatePoiModal>, <EditPoiModal>   Modals (conditional)
```

## State-Management-Pattern

### Zentraler Hook: `useWorkspace()`

Liegt in [src/firebase/useWorkspace.ts](../../src/firebase/useWorkspace.ts). Gibt ein `WorkspaceAPI`-Object zurück mit:

- **State:** `pois[]`, `settings`, `plan`, `dayBriefings`, `dayBudgets`, ...
- **Actions:** `addPoi`, `updatePoi`, `likePoi`, `togglePoi`, `setHomebase`, ...
- **Status:** `status: 'connecting' | 'ready' | 'error'`

Intern: Zwei Firestore-Listener (`onSnapshot`):
- `workspaces/{id}` — das Haupt-Doc mit Settings/TripPlan
- `workspaces/{id}/pois` — die POI-Subcollection

`setState()`-Aufrufe bei Listener-Updates triggern Re-Renders im ganzen Tree.

### Lokale State-Inseln

Komponenten halten eigenen State nur für UI-spezifische Dinge (z.B. Dropdown-open, Form-Input). **Nie** business-relevanten State lokal — der muss durch `useWorkspace` laufen, damit alle Clients synchron sind.

### Refs statt State bei Module-Level-Cache

`RoutePolyline` hat ein Module-Level `DIRECTIONS_CACHE` Map (außerhalb der React-Tree-Lifecycle). Pattern auch in `placesNewApi.ts` mit `ENRICHMENT_CACHE`. Session-persistent, aber nicht React-rebound.

## Hooks-Katalog

| Hook | Zweck |
|---|---|
| [`useWorkspace`](../../src/firebase/useWorkspace.ts) | **Hauptzugriff auf Firestore-State + Actions** |
| [`useAuth`](../../src/hooks/) | Firebase-Auth-Status, User-Objekt |
| [`useMyFamily`](../../src/hooks/useMyFamily.ts) | Family-Kontext aus Settings + current user |
| [`useMyLocation`](../../src/hooks/useMyLocation.ts) | Geolocation-Watch (`watchPosition`) |
| [`useWeather`](../../src/hooks/useWeather.ts) | Open-Meteo-Forecast (in-memory 1h cache) |
| [`useTripPlan`](../../src/hooks/useTripPlan.ts) | Trip-Plan-State-Mapping (legacy, langsam durch useWorkspace ersetzt) |
| [`useSettings`](../../src/hooks/useSettings.ts) | Settings-State (legacy, gleicher Hinweis) |
| [`useLocalPOIs`](../../src/hooks/useLocalPOIs.ts) | Vor-Firestore-Relikt (kaum noch in Gebrauch) |

## Wichtige Patterns

### Render-less Components
`HomebasePhotoSync` in [App.tsx](../../src/App.tsx) — rendert nichts, aber sitzt innerhalb `<APIProvider>` damit es `useMapsLibrary('places')` nutzen kann. Triggert Photo-Fetch als Side-Effect.

### Kontrollierte Modals via State
`addMode: AddMode | null` steuert das `AddPoiMenu`-Bottom-Sheet. Kein `useImperativeHandle`/Ref — simpler state-driven flow.

### Optimistic UI
`useWorkspace.likePoi(id)` updatet lokale `pois[]` sofort, feuert parallel `updateDoc(…)`. Bei Rejection überschreibt der nächste `onSnapshot` den optimistischen Wert.

### FieldMask-basierte API-Calls
`fetchPlaceEnrichment` nutzt Places API (New) mit strict `X-Goog-FieldMask`-Header → zieht nur die 5 Felder die wir brauchen, spart Kosten.

## Anti-Patterns (nicht machen)

- **Prop-Drilling durch >3 Ebenen** — stattdessen Hook direkt im Consumer aufrufen
- **Business-State lokal halten** — würde Multi-Client-Sync brechen
- **Direct Firestore-Calls aus Components** — alles durch `useWorkspace` (Ausnahme: Places/Google Maps, die haben eigene Libs)
- **useEffect mit leerem Dependency-Array für Fetch** — Firestore-`onSnapshot` handled das automatisch

## Related Issues

- #178/#179 Module-Level-Caches
- #169 AI-Briefing Ghost-Mount (React-StrictMode-Issue)
- #151 User-Management-UI (settings-heavy component)
