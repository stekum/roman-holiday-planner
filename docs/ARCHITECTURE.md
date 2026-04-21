# Roman Holiday Planner — Architecture

High-Level-Überblick. Für Details zu einzelnen Subsystemen siehe die Unter-Docs im [`architecture/`](./architecture/)-Ordner.

## Overview

**Client-only Progressive Web App** mit Firebase als Backend. Kein eigener Server — alle Business-Logic läuft im Browser, persistenter State liegt in Firestore, Auth über Firebase Authentication, statische Assets auf GitHub Pages.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (PWA, React 19 + Vite)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │ Entdecken │  │  Reise   │  │ Settings │  │  Auth-Gate │   │
│  │  (POIs)  │  │  (Days)  │  │          │  │            │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘   │
│       └─────────────┴──────────────┴──────────────┘         │
│                          │                                  │
│          ┌───────────────┴────────────────┐                 │
│          ▼                                ▼                 │
│   useWorkspace()                   getFirebase()            │
│   (React hook w/                   (SDK wrapper)            │
│    Firestore listeners)                                     │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────────┐        ┌────────────────────────┐
│  Firebase Firestore     │        │  Firebase Auth         │
│  workspaces/{id}/       │        │  Google + Microsoft    │
│    pois/{poiId}         │        │  Custom Tokens (E2E)   │
│  users/{uid}            │        └────────────────────────┘
│                         │
│  Cloud Functions        │
│  - persistPoiPhoto      │────▶ Firebase Storage
│  - notifyAccessRequest  │────▶ Resend API (email)
└─────────────────────────┘

External APIs:
  Google Maps JavaScript API  ────▶ Map-Rendering, Routes, Places
  Places API (New)            ────▶ Enrichment (priceRange, aiSummary)
  Gemini (Firebase AI Logic)  ────▶ NL-Search, Day-Plan, Briefing
  Google Analytics 4          ────▶ Usage Tracking
  Open-Meteo                  ────▶ Wetter-Forecast (keyless)
```

## Tech Stack

- **Frontend:** React 19 (StrictMode), TypeScript, Vite (Rolldown bundler)
- **Styling:** Tailwind v4 CSS-only, custom terracotta/ink palette
- **State:** React `useState` + `useWorkspace` (Firestore-backed)
- **Maps:** `@vis.gl/react-google-maps` + Google Maps JS API
- **AI:** `@google/generative-ai` (Gemini 2.5 Flash) via Firebase AI Logic
- **Backend:** Firebase Firestore + Storage + Auth + Functions (Node 20, europe-west1)
- **Hosting:** GitHub Pages (static, separate `/` = prod, `/beta/` = beta)
- **CI/CD:** GitHub Actions (lint+build PR-gate, auto-beta-deploy, release-please)

## Subsystems

| Dokument | Scope |
|---|---|
| [`auth.md`](./architecture/auth.md) | Google/Microsoft-Login, Approval-Flow, Firestore Security Rules, Admin-Config |
| [`data-model.md`](./architecture/data-model.md) | Firestore-Kollektionen, Workspace-Struktur, POI/User-Schemas, Storage-Paths |
| [`deploy.md`](./architecture/deploy.md) | Beta/Prod-Pipeline, Rules-Deploy, Service-Worker, Release-Please-Flow |
| [`components.md`](./architecture/components.md) | React-Komponenten-Hierarchie, State-Management-Patterns, Custom Hooks |
| [`ai.md`](./architecture/ai.md) | Gemini-Integration, Prompts, alle AI-Features (Search, Day-Plan, Briefing, etc.) |

## Key Design Decisions

### Client-only Architektur
Kein eigener Server → kein Operations-Overhead, Firebase hostet alles Stateful. Limitation: Secrets (API-Keys) sind teilweise im Client-Bundle sichtbar (Firebase-Keys sind OK öffentlich, Google-Maps/Gemini brauchen Referer-Restrictions).

### Shared Workspace statt User-pro-Trip
Ein einziger `workspaces/default`-Namespace für alle User statt per-User-Workspaces. Reduziert Komplexität für Small-Group-Use-Case (2 Familien). Multi-Trip kommt erst mit v3.0.

### Firestore-Listeners statt REST
`onSnapshot(…)`-basiertes Echtzeit-Sync. Optimistische Updates clientseitig; Server-Bestätigung kommt über denselben Listener zurück.

### Kein eigener State-Store
`useWorkspace()` Hook liefert State + Actions; darüber liegt normaler React-State. Kein Redux/Zustand/Jotai — wäre bei dieser Komplexität Overkill.

### Cost-Conscious Cache-Strategien (v2.1)
Mehrschichtiger Cache für teure Google-API-Calls: Module-Level Maps (#178) → Firestore als SoT (#179) → Dev-Skip-Flags (#180). Details in [`data-model.md`](./architecture/data-model.md) und inline Kommentaren in `src/lib/placesNewApi.ts` + `src/components/map/RoutePolyline.tsx`.
