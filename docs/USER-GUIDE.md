# Roman Holiday Planner — Benutzerhandbuch

> Mobile-first PWA für die gemeinsame Planung einer Rom-Reise (2 Familien).  
> **Live:** https://stekum.github.io/roman-holiday-planner/  
> **Beta:** https://stekum.github.io/roman-holiday-planner/beta/

---

## Übersicht

Die App hat drei Hauptbereiche (Tabs in der oberen Leiste):

| Tab | Symbol | Funktion |
|---|---|---|
| **Entdecken** | 🧭 | POI-Liste + Karte mit Filtern |
| **Reise** | ✈️ | Tagesplanung mit KI-Unterstützung |
| **Settings** | ⚙️ | Familien, Reisedaten, Unterkunft |

---

## 1. Entdecken-Tab

### Karte (obere Hälfte)

- Zeigt alle POIs als farbige Pins (Farbe = Familie)
- **Homebase** erscheint als 🏠-Pin
- **Eigener Standort** als blauer pulsierender Punkt (Geolocation)
- **Pin antippen** → InfoWindow mit Foto, Kategorie, Adresse, Bewertung, Öffnungszeiten, Google Maps / Instagram Link
- **Karte antippen auf Google POI** (z.B. Restaurant) → direkt hinzufügen-Flow

### POI-Liste (untere Hälfte)

**Toolbar:**
- Zähler: `6/40 Orte` (gefiltert/gesamt)
- **Filter**-Button (Badge zeigt Anzahl aktiver Filter)
- **Sortierung:** Neueste zuerst, Beliebteste, Nächste (zur Homebase), A–Z
- **Ansicht:** Grid (Karten) oder Kompakt (Liste)

**Filter-Panel** (nach Klick auf Filter):
- **Kategorie:** 🏛️ Kultur, 🍕 Pizza, 🍨 Gelato, 🍝 Trattoria, 🍸 Aperitivo, 📍 Sonstiges
- **Familie:** Filtert nach der Familie die den POI hinzugefügt hat
- **Inbox:** Nur POIs die noch verortet werden müssen
- **„Alle zurücksetzen"** löscht alle Filter
- Filter wirken auf **Liste UND Karte** gleichzeitig (Karten-Pins werden ein-/ausgeblendet)

**POI-Karte** zeigt:
- Foto (oder Kategorie-Emoji als Platzhalter)
- Kategorie-Badge + Familien-Badge
- Titel, Entfernung zur Homebase, Adresse
- Google-Bewertung (Sterne + Anzahl)
- Beschreibung
- ❤️ Like-Button + Zähler
- 🏠 Als Homebase setzen
- ✏️ Bearbeiten
- 🗑️ Löschen
- **„+ Zum Tag"** — POI einem Reisetag zuordnen
- Tag-Badge zeigt zugeordnete Tage (z.B. „Tag 3 · Mo, 14. Apr")

### POIs hinzufügen

**„+"**-Button unten rechts → 4 Methoden:

| Methode | Beschreibung |
|---|---|
| **Suchen** | Google Places Textsuche — findet echte Orte mit Foto, Adresse, Bewertung |
| **Auf Karte** | Crosshair-Modus — auf der Karte tippen oder Google POI antippen |
| **Manuell** | Freitext-Eingabe (Name, Kategorie, Beschreibung) — landet in der Inbox |
| **Instagram** | Instagram-URL einfügen → extrahiert Name + Foto aus og:metadata |

**Inbox-System:** Manuell oder per Instagram hinzugefügte POIs haben keine Koordinaten. Sie erscheinen mit 📍-Badge und können über den „Verorten"-Button auf der Karte platziert werden.

### POI bearbeiten

- ✏️-Button auf der POI-Karte
- Änderbar: Titel, Kategorie, Familie, Beschreibung
- Google Places-Daten (Foto, Adresse, Bewertung) werden nicht überschrieben

---

## 2. Reise-Tab

### Tagesplanung

- **Tag-Tabs** oben: ein Tab pro Reisetag (aus den Settings-Daten berechnet)
- Jeder Tab zeigt Wetter-Icon + Anzahl geplanter Stops
- **Stop-Liste:** Nummerierte POIs in der Reihenfolge des Tagesplans
- ↑↓ Pfeile zum Umordnen
- 🗑️ Stop entfernen
- **Route:** Karte zeigt Polyline durch alle Stops (Start/Ende = Homebase)
- **Routen-Zusammenfassung:** Gesamtdistanz + Gehzeit

### Route optimieren

- **„Route optimieren"**-Button: nutzt Google Directions API um die optimale Reihenfolge zu berechnen
- Berücksichtigt Homebase als Start- und Endpunkt

### KI-Tagesplan (✨ AI Tagesplan)

- **Prompt-Eingabe:** Natürliche Sprache, z.B. _„Entspannter Tag in Trastevere mit gutem Essen"_
- **Familie auswählen:** Für welche Familie plant die KI (beeinflusst Familien-Zuordnung der neuen POIs)
- **Gemini 2.5 Flash** generiert 4–7 Stops mit:
  - Name (echter Ort in Rom)
  - Kategorie
  - Beschreibung + Begründung
  - Ungefähre Uhrzeit
- **Vorschau:** Stops werden als Liste gezeigt, können geprüft werden
- **„Zur Tour hinzufügen":** Akzeptierte Stops werden als neue POIs gespeichert und dem Tag zugeordnet
- **Schutz:** Homebase wird nie als Stop eingefügt (weder im Prompt noch im Code)

### Tagesbeschreibung

- Nach KI-Plan-Akzeptierung wird eine Zusammenfassung des Tages angezeigt (vom KI generiert)

---

## 3. Settings-Tab

### Reisedaten

- **Von / Bis:** Start- und Enddatum der Reise
- Daraus werden die Tag-Tabs im Reise-Tab berechnet

### Familien

- **Familien hinzufügen/bearbeiten:** Name + Farbe
- Farbe bestimmt die Pin-Farbe auf der Karte
- **Kinder-Info:** Optionales Freitextfeld (z.B. „2 Kinder, 4 und 7 Jahre") — wird dem KI-Planer mitgegeben
- Familie löschen (nur wenn keine POIs zugeordnet)

### Homebase (Unterkunft)

- **Google Places Suche** um die Unterkunft zu finden
- Zeigt Name, Adresse, Foto, Bewertung
- Wird als 🏠-Pin auf der Karte angezeigt
- Dient als Start-/Endpunkt für Routen
- Entfernungsberechnung (Luftlinie) für jeden POI

---

## 4. Übergreifende Features

### Echtzeit-Synchronisation

- Alle Daten (POIs, Settings, Tagesplan) werden über **Firebase Firestore** synchronisiert
- Beide Familien sehen Änderungen sofort
- Optimistische UI-Updates (keine Wartezeit auf Server-Bestätigung)

### Wetter

- Wettervorhersage pro Reisetag in den Tag-Tabs
- Basiert auf den Homebase-Koordinaten

### Fotos

- **Google Places Fotos** werden automatisch geladen (bei Suche + Karten-Klick)
- **Cloud Function** (`persistPoiPhoto`) kopiert Google-Fotos nach Firebase Storage (CORS-sichere URLs)
- **Fallback:** Kategorie-Emoji als Gradient-Platzhalter wenn kein Foto vorhanden

### PWA (Progressive Web App)

- **Installierbar:** „Zum Startbildschirm hinzufügen" im Browser
- **Service Worker:** Cacht statische Assets für schnelleres Laden
- **App-Manifest:** Icon, Splash Screen, Standalone-Modus

### Passwort-Schutz

- Optionaler SHA-256 Passwort-Check beim Öffnen der App
- Session-basiert (einmal pro Browser-Session eingeben)
- Konfiguriert via `VITE_APP_PASSWORD_SHA256` in `.env.local`

---

## 5. Kategorien

| Emoji | Kategorie | Beispiele |
|---|---|---|
| 🏛️ | Kultur | Kolosseum, Vatikan, Museen, Kirchen |
| 🍕 | Pizza | Pizzerien |
| 🍨 | Gelato | Gelaterias |
| 🍝 | Trattoria | Trattorien, Restaurants |
| 🍸 | Aperitivo | Bars, Rooftop-Bars |
| 📸 | Instagram | Foto-Spots |
| 📍 | Sonstiges | Parks, Märkte, Shops, alles andere |

---

## 6. Known Issues

| Issue | Status | Workaround |
|---|---|---|
| Google Maps Marker-Cleanup in `@vis.gl/react-google-maps` v1.8.x | Gefixt | `PoiMarker`-Komponente mit imperativem `marker.map` statt React-Unmount |
| Homebase erschien als POI-Duplikat nach KI-Plan | Gefixt | Prompt-Regel + defensiver Filter in `onAiAccept` |
| Google Places Fotos laufen nach ~24h ab (CORS-Fehler) | Gefixt | Cloud Function kopiert Fotos nach Firebase Storage |
| Instagram og:metadata erfordert CORS-Proxy | Bekannt | Nutzt externen CORS-Proxy — kann instabil sein |

---

## 7. Changelog

Siehe [GitHub Releases](https://github.com/stekum/roman-holiday-planner/releases) für versionierte Release-Notes.
