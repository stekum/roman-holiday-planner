# Roadmap

> Priorisiert nach Nutzen für die Rom-Reise. Phase 1 = vor der Reise fertig, Rest = wenn Zeit ist.
> Einzelne Items werden als [GitHub Issues](https://github.com/stekum/roman-holiday-planner/issues) getrackt.

---

## 🎯 Phase 1 — Pre-Trip Essentials

| Feature | Size | Status |
|---|---|---|
| **Voting / Wunschliste** — pro POI 👍/👎/🤷 pro Familie, sortierbar nach Beliebtheit | M | Backlog |
| **Opening Hours** — „Jetzt geöffnet" / „Schließt um 18:00" auf jeder Card (Google Places) | S | Backlog |
| **Wetter-Forecast** — ☀️ 22°C auf jedem Tag-Chip im Reise-Tab (Open-Meteo, kostenlos) | S | Backlog |
| **Route Optimizer** — Button „Beste Reihenfolge" nutzt Google `optimizeWaypoints` | S | Backlog |
| **PWA / Installierbar** — manifest.json + Service Worker, Homescreen-Icon, Offline-Cache | S | Backlog |
| **Sort & Filter** — POI-Liste filtern nach Kategorie/Familie/Inbox, sortieren nach Distanz/Votes | S | Backlog |
| **Walking Time** — Gehzeit zwischen Stops im Tagesplan anzeigen (aus Directions-Legs) | S | Backlog |

## 🤖 Phase 2 — AI-Features

| Feature | Size | Status |
|---|---|---|
| **AI Route Optimizer** — zeitlich sinnvolle Reihenfolge (Frühstück zuerst, Aperitivo zuletzt, Öffnungszeiten beachten) | M | Backlog |
| **Natural Language Search** — „Romantisches Restaurant mit Terrasse in Trastevere" → Claude → Places API | M | Backlog |
| **AI Tages-Briefing** — Morgen-Summary mit Wetter, Öffnungszeiten, Warnungen, Tipps | M | Backlog |
| **AI POI Suggestions** — „Basierend auf euren Favoriten: 5 Orte die ihr noch nicht habt" | L | Backlog |
| **Smarter IG-Import** — Claude extrahiert Ortsnamen aus Instagram-Captions → auto-verorten | L | Backlog |

## 📱 Phase 3 — Polish & Collaboration

| Feature | Size | Status |
|---|---|---|
| **Expense Tracker** — Ausgaben loggen, Split zwischen Familien, Schulden-Abrechnung | L | Backlog |
| **Packing List** — Kategorisiert, pro Person zuweisbar, Templates | M | Backlog |
| **Notizen / Kommentare** pro POI — kollaborativer Thread | S | Backlog |
| **PDF-Export** — Tagesplan als druckbare Übersicht | M | Backlog |
| **Aktivitäts-Feed** — „Stefan hat Pizzarium Bonci hinzugefügt · vor 3 Min" | M | Backlog |
| **Drag & Drop** im Tagesplaner — Touch-Drag statt ↑↓-Buttons | M | Backlog |
| **Multi-Trip / Workspaces** — „Rom 2026" / „Provence 2027" | M | Backlog |
| **Share-Link (Read-Only)** — Öffentlicher Link ohne Login für Freunde/Familie | S | Backlog |

## 🔮 Phase 4 — Moonshots

| Feature | Inspiration |
|---|---|
| **Social-Clip Bookmarklet** — IG/TikTok → POI mit einem Klick | GoPlaces, Plotline |
| **AR Walking Navigation** | Google Maps Live View |
| **Restaurant-Reservierungen** (TheFork API) | Mindtrip |
| **Offline Map Tiles** | Maps.me |
| **Dark Mode** | — |
| **Undo / Soft-Delete** (7-Tage-Papierkorb) | Wanderlog |

---

## Wettbewerber-Inspiration

| App | Was wir davon lernen |
|---|---|
| [Wanderlog](https://wanderlog.com/) | Route Optimizer, Offline, Expense Splitting, Opening Hours |
| [WePlanify](https://weplanify.com/) | Voting/Polls, Packing Lists, Shared Budget |
| [TREK](https://github.com/mauriceboe/TREK) | PWA-Offline, Weather (Open-Meteo), Self-hosted |
| [Layla.ai](https://layla.ai/) | AI Itinerary Generation, NL Search |
| [Mindtrip](https://mindtrip.ai/) | Collaborative Voting, AI Suggestions |
| [GoPlaces](https://goplacesapp.com/) / [TripStash](https://trytripstash.com/) | Social-Media → Map Pipeline |
