# Roman Holiday Planner

Mobile-first PWA für die gemeinsame Planung einer Rom-Reise zweier Familien. Kollaborative POI-Sammlung, KI-Tagesplanung und Fußgänger-Routing in einer App.

**Live:** https://stekum.github.io/roman-holiday-planner/
**Beta:** https://stekum.github.io/roman-holiday-planner/beta/

---

<img width="1459" height="2171" alt="D0DC074F-6D83-4DC6-8157-861D6ADE4449" src="https://github.com/user-attachments/assets/38b3e881-2df7-4934-b7d9-c195b4a3f5fe" />


## Features

- **Entdecken** — POI-Liste + Google Maps mit farbigen Familien-Pins, Filter nach Kategorie/Familie
- **4 Wege zum Hinzufügen** — Google Places Suche, Karten-Tap, manuell (Inbox), Instagram-Link
- **KI-Tagesplaner** — Gemini 2.5 Flash generiert Tagesrouten aus natürlicher Sprache
- **Tagesplanung** — POIs den Reisetagen zuordnen, Routen-Optimierung, Walking-Distanz + Dauer
- **Echtzeit-Sync** — Firebase Firestore, alle Geräte sehen Änderungen sofort
- **Wetter** — 16-Tage-Vorhersage pro Reisetag (Open-Meteo)
- **PWA** — Installierbar, offline-fähig, Service Worker

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Firebase 12 · Google Maps · Gemini AI

---

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [Benutzerhandbuch](docs/USER-GUIDE.md) | Alle Features, Workflows, Known Issues |
| [Architektur](docs/ARCHITECTURE.md) | System-Overview, Subsystem-Docs (Auth, Data-Model, Deploy, Components, AI) |
| [Developer Guide](AGENTS.md) | Tech Stack, Setup, Code-Konventionen, Deployment, Testing |
| [Releases](https://github.com/stekum/roman-holiday-planner/releases) | Versionierte Release-Notes |
| [Project Board](https://github.com/users/stekum/projects/1) | Issues, Milestones, Roadmap |
