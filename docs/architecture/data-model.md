# Architecture: Data Model

## Firestore Collections

```
firestore/
├── workspaces/{workspaceId}                    (default: "default")
│   ├── .settings               (Map)           settings + families + homebase + tripConfig
│   ├── .tripPlan               (Map)           days: Record<ISO-date, POI-id[]>
│   ├── .dayDescriptions        (Map)           AI-generated overview per day
│   ├── .dayBriefings           (Map)           AI-generated briefings per day
│   ├── .dayBudgets             (Map)           { budget, spent } per day
│   ├── .postTripAnalysis       (string)        AI recap (#43)
│   │
│   └── pois/{poiId}                            Subcollection
│       ├── name, address, coords, category
│       ├── placeId              (string)       Google Places ID
│       ├── image                (string)       Firebase-Storage-URL (nach #91-CloudFn)
│       ├── priceRange, primaryType, aiSummary  Enrichment-Felder (#167)
│       ├── likes, votes, visitStatus
│       └── comments (Array of Map)
│
└── users/{uid}
    ├── email, displayName, photoURL
    ├── status: 'pending' | 'approved' | 'declined'
    ├── createdAt
    └── (intern) __e2eTestUser  (für E2E-Test-Users)
```

## Storage Paths

```
gs://<projekt>.appspot.com/
└── poi-photos/{workspaceId}/{poiId}.jpg        (public read, via persistPoiPhoto CloudFn)
```

## Workspace-Namespace

Aktuell nur ein Workspace: `VITE_FIREBASE_WORKSPACE_ID=default`. Alle User sehen dieselben POIs/Settings. Vorbereitung für Multi-Trip-Szenario (v3.0) — dort würde der Namespace pro Trip variieren.

## State-Flow

```
User-Action (UI)
      │
      ▼
useWorkspace().xxx()        ──────►  Optimistic UI Update
      │
      ▼
updateDoc(…)                ──────►  Firestore write
      │                                     │
      ▼                                     ▼
Firestore → onSnapshot(…)   ──────►  setState (re-render)
                                            │
                                            ▼
                                     Cloud Function trigger?
                                     - persistPoiPhoto
                                     - notifyAccessRequest
```

Der `onSnapshot`-Listener fired auch **für den eigenen Write** zurück — UI wird damit konsistent mit Server-State, auch wenn Optimistic-Update was übersehen hat.

## Wichtige Patterns

### Optimistic Updates
`useWorkspace` wendet Änderungen sofort lokal an, bevor Firestore bestätigt. Bei Fehler rollbackt der nächste `onSnapshot` automatisch (weil der Server-State dann überschreibt).

### Module-Level Cache (#178)
`src/lib/placesNewApi.ts` + `src/components/map/RoutePolyline.tsx` haben Module-Level Maps als Session-Cache. Verhindert Doppel-Calls an Google-APIs für gleiche placeIds / coords.

### Firestore-als-Cache-SoT (#179)
Beim Laden der POIs wird `primeEnrichmentCache(placeId, data)` aufgerufen → Module-Cache ist sofort vorgewärmt. Vermeidet Re-Fetch beim Component-Render.

### Custom Token für E2E
`mint-e2e-token.mjs` erstellt Firestore-User `e2e-test-user-1` mit `status='approved'` + Custom-Token. Playwright lädt Token in `sessionStorage`, `useAuth` erkennt das und signed mit `signInWithCustomToken` rein.

## Indexes

Keine Composite-Indizes aktuell definiert (`firestore.indexes.json` ist leer). Single-Field-Filter genügen für den POI-Fetch (`collection(workspaces/default/pois)`).

## Schema-Migrationen

Es gibt keinen formalen Migrations-Mechanismus. Änderungen am Datenmodell:
1. Bestehende Felder bleiben (kein Dropping — Firestore erlaubt Mixed Schemas)
2. Neue Felder werden Optional behandelt (`field?: Type` in TS)
3. Backfill-Scripts bei Bedarf (`scripts/backfill-places-enrichment.mjs` als Beispiel)

## Related Issues

- #112 User-Model (Auth)
- #167 Places-API-New Enrichment-Felder
- #178/#179 Caching-Strategien
- #91 Photo-Persistenz nach Firebase Storage
