# Roman Holiday Planner

Mobile-first Reise-App für eine gemeinsame Rom-Woche zweier Familien.
Kollaborative POI-Sammlung, Instagram-Import via Google Places, Tagestour-Planer mit echtem Fußgänger-Routing.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · `@vis.gl/react-google-maps` · lucide-react

---

## Features

- **Drei Bereiche**: Entdecken (Karte + POI-Liste) · Reise (Tages-Tabs mit Routen) · Einstellungen
- **Google-Maps-Karte** mit farbigen Pins pro Familie
- **Vier Wege zum POI hinzufügen** (FAB unten rechts):
  - 🔍 Places-Suche
  - 📍 Tap auf die Karte (mit Reverse-Geocoding)
  - ✍️ Manuell (landet in der Inbox zur späteren Verortung)
  - 📸 Instagram-Link (best-effort og:image-Extraktion via CORS-Proxy, optional Place-Picker; ohne Ort → Inbox)
- **Multi-Day-Tagesplaner**: POIs den Tagen der Reise zuordnen, Reihenfolge festlegen, pro Tag eigene Fuß-Route via Google Directions mit Gesamtdistanz + Dauer
- **Konfigurierbare Familien**: Name + Farbe, beliebig viele, in den Settings editierbar
- **Inbox**: POIs ohne Koordinaten werden sichtbar markiert und lassen sich per Place-Picker nachträglich verorten
- **Passwort-Gate** (SHA-256 im Browser) als Deterrent
- **LocalStorage-Persistenz** für POIs, Likes, Tagesplan und Settings

---

## Setup

```bash
npm install
cp .env.local.example .env.local
# .env.local öffnen und Werte eintragen (siehe unten)
npm run dev
```

### Google Maps API-Key

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen, Projekt anlegen
2. Billing aktivieren (Google gibt 200 $/Monat Gratis-Credit — für privaten Prototyp mehr als genug)
3. **APIs & Services → Library** → folgende APIs aktivieren. **Wichtig**: Google listet jeweils eine klassische und eine „(New)"-Version. Diese App nutzt `@vis.gl/react-google-maps` und greift auf die **klassischen** Services zu. Du brauchst also:
   - **Maps JavaScript API**
   - **Places API** (❗ nicht „Places API (New)" — sondern die klassische ohne Zusatz)
   - **Directions API** (❗ nicht „Routes API" — wieder die klassische ohne Zusatz)
   - **Geocoding API** (für den „Auf Karte tippen"-Flow / Reverse-Geocoding)

   Wenn Places-Autocomplete im „Verorten"- oder „Instagram"-Modal keine Vorschläge zeigt: fast sicher ist die klassische „Places API" nicht aktiviert. Die App zeigt dann `REQUEST_DENIED` als Hinweis im Suchfeld.
4. **APIs & Services → Credentials → Create credentials → API key**
5. Direkt nach dem Erstellen **einschränken**:
   - **Application restrictions → HTTP referrers**:
     ```
     https://<dein-username>.github.io/roman-holiday-planner/*
     http://localhost:5173/*
     ```
   - **API restrictions**: nur die drei oben genannten APIs zulassen
6. **IAM & Admin → Quotas** → auf jede der drei APIs einen **Tages-Cap** setzen (z. B. 500 Requests / Tag). Selbst im Worst Case < 1 € Kosten pro Tag.
7. Key in `.env.local` als `VITE_GOOGLE_MAPS_API_KEY=…` eintragen

### Passwort-Gate

```bash
# Passwort-Hash erzeugen (Beispiel-Passwort: "roma2026")
echo -n "roma2026" | shasum -a 256
# → 3f…  (64-stelliger Hex-String)
```

Den Hash in `.env.local` bei `VITE_APP_PASSWORD_SHA256` eintragen. Das Original-Passwort der Familie über einen separaten Kanal (Signal, Telegram) teilen.

**Wichtig:** Der Gate ist kein echter Schutz — jeder mit DevTools kann ihn umgehen. Der eigentliche Schutz vor API-Missbrauch sind **Referrer-Restrictions + Tages-Quotas** auf dem Google-Key.

---

## Deploy auf GitHub Pages

```bash
# Einmalig: neues GitHub-Repo namens "roman-holiday-planner" anlegen
git init
git remote add origin git@github.com:<username>/roman-holiday-planner.git
git add . && git commit -m "initial"
git push -u origin main

# Deploy
npm run deploy
```

`gh-pages` pusht den `dist/`-Ordner in den `gh-pages`-Branch. Im Repo unter **Settings → Pages** die Source auf `gh-pages` / `/ (root)` setzen.

Die App läuft danach unter `https://<username>.github.io/roman-holiday-planner/`.

Der `base`-Pfad in [vite.config.ts](vite.config.ts) ist bereits auf `/roman-holiday-planner/` gesetzt — falls du das Repo anders nennst, hier anpassen.

---

## Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Dev-Server auf `http://localhost:5173/roman-holiday-planner/` |
| `npm run build` | Produktions-Build in `dist/` (TypeScript-Check + Vite) |
| `npm run preview` | Lokaler Preview des Produktions-Builds |
| `npm run deploy` | `build` + push auf `gh-pages`-Branch |
| `npm run lint` | ESLint |

---

## Projektstruktur

```
src/
├── App.tsx                      PasswordGate → APIProvider → Layout
├── main.tsx
├── index.css                    Tailwind v4 + @theme Design-Tokens
├── data/pois.ts                 Seed-POIs + Types
├── hooks/
│   ├── useLocalPOIs.ts          POI-State + localStorage
│   └── useDayPlan.ts            Tagestour-Auswahl + Reihenfolge
└── components/
    ├── Header.tsx
    ├── PasswordGate.tsx
    ├── MissingKeyNotice.tsx
    ├── map/
    │   ├── RomeMap.tsx          <GMap> + <AdvancedMarker> + RoutePolyline
    │   └── RoutePolyline.tsx    DirectionsService + <Polyline>
    ├── poi/
    │   ├── PoiList.tsx
    │   └── PoiCard.tsx
    ├── instagram/
    │   ├── InstagramImportModal.tsx
    │   └── PlacesAutocomplete.tsx
    └── dayplanner/
        ├── DayPlanner.tsx
        └── RouteSummary.tsx
```

---

## Instagram-Metadaten-Scraping

Die App versucht, aus einem Instagram-Link `og:image` / `og:title` / `og:description` zu extrahieren. Weil Instagram direktes Browser-Fetchen blockiert (CORS + Anti-Bot), geht der Request über einen öffentlichen CORS-Proxy (`corsproxy.io`). Das ist **best effort** — der Proxy kann jederzeit kaputtgehen oder rate-limiten. Location-Daten sind in den og-Tags **nicht** enthalten.

Wenn Metadaten-Fetch fehlschlägt: der Link wird trotzdem gespeichert, der POI landet mit `needsLocation: true` in der Inbox und kann später manuell verortet werden.

## Offene Erweiterungen (nach Prototyp)

- Mehrere Tage planen (Multi-Day Itinerary)
- Synchronisation zwischen Geräten (Firebase / Supabase)
- Meta oEmbed für echte Instagram-Thumbnails (erfordert Meta-App-Token + serverseitigen Proxy wegen CORS)
- Drag-and-Drop-Reihenfolge im Planner (z. B. `@dnd-kit/core`)
- Filter nach Familie / Kategorie / Likes
