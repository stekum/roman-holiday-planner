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
- **„Was Gäste sagen"** — KI-generierte Review-Zusammenfassung (lila Block, nur bei POIs die via Suche oder Karten-Klick hinzugefügt wurden, Quelle: Google Places API editorialSummary)
- ❤️ Like-Button + Zähler
- 🏠 Als Homebase setzen
- ✏️ Bearbeiten
- 🗑️ Löschen
- **„Navigieren"** — öffnet Google Maps Navigation (zu Fuß) direkt zum POI
- **„Street View"** — öffnet Google Street View direkt in der App-Karte (kein neuer Tab); schließen via ✕ im Panorama
- **„Google Maps"** — öffnet den Ort in Google Maps (externer Link)
- **„+ Zum Tag"** — POI einem Reisetag zuordnen
- Tag-Badge zeigt zugeordnete Tage (z.B. „Tag 3 · Mo, 14. Apr")

### POIs hinzufügen

**„+"**-Button unten rechts → 5 Methoden:

| Methode | Beschreibung |
|---|---|
| **Suchen** | Google Places Textsuche (debounced 350ms, bis 8 Ergebnisse) — findet echte Orte mit Foto, Adresse, Bewertung, Öffnungszeiten |
| **Vibes-Suche** ✨ | Natürliche Sprache → Gemini übersetzt Vibes + Stadtteil in eine Places-API-Suche. Beispiel: _„Romantisches Restaurant mit Terrasse in Trastevere"_ → zeigt passende Treffer + erkannte Kriterien als Chips |
| **Auf Karte** | Crosshair-Modus — Karte tippen oder Google POI antippen → Place-Details werden automatisch geladen |
| **Manuell** | Freitext-Eingabe (Name, Kategorie, Beschreibung) — landet in der Inbox (ohne Koordinaten) |
| **Instagram** | Instagram-URL einfügen → extrahiert Name + Foto aus og:metadata (via CORS-Proxy: corsproxy.io → allorigins.win → codetabs.com) |

Alle Methoden bieten: **Familie-Auswahl** (farbige Pill-Buttons) + **Kategorie-Auswahl** (7 Kategorien mit Emoji) + **Notiz** (Freitext).

**AI-Vorschläge (oben im Entdecken-Tab):** Kollabierbarer Bereich 🪄 _„AI-Vorschläge — Basierend auf euren N Orten"_. Bei Klick auf **„Vorschläge generieren"** analysiert Gemini die vorhandene POI-Liste (Kategorien-Verteilung + Homebase) und schlägt 5 passende neue Orte in Rom vor. Jede Card zeigt Foto, Rating, Begründung + **„Hinzufügen"**-Button. „Neue Runde" lädt frische Vorschläge. Bestehende POIs werden automatisch ausgefiltert — keine Duplikate.

**Inbox-System:** Manuell oder per Instagram hinzugefügte POIs haben keine Koordinaten. Sie erscheinen mit 📍-Badge „Ort fehlt" und können über den „Verorten"-Button auf der Karte platziert werden (Google Places Suche → Koordinaten + Details werden übernommen).

**Inbox-Banner:** Erscheint über der Liste wenn POIs ohne Koordinaten existieren: _„N Ort(e) warten auf Verortung"_.

### POI bearbeiten

- ✏️-Button auf der POI-Karte
- Änderbar: Titel, Kategorie, Familie, Beschreibung
- Google Places-Daten (Foto, Adresse, Bewertung) werden nicht überschrieben

### Preis-Badge + Cuisine-Tag (€ / ¥ / $ / £ / CHF)

- POI-Cards zeigen bei vorhandener Places-Daten ein **Preis-Badge**:
  - **Places API (New) `priceRange`** wird bevorzugt und als konkreter Betrag gerendert: **„€30–€50"** oder **„€100+"** (wenn Google eine obere Grenze offen lässt)
  - **Fallback:** Klassischer `price_level` (0-4) als Symbolfolge: **„€€€"** — für Places die kein priceRange haben
  - Währungssymbol aus Trip-Konfiguration-Land: Italien → €, Japan → ¥, USA → $, UK → £, Schweiz → CHF, sonst €
- POI-Cards zeigen einen **Cuisine-Tag** (z.B. „Italian restaurant", „Pizzeria", „Wine bar") wenn Google Places einen `primaryType` liefert
- Für ältere POIs (vor #167) werden priceRange + cuisine via Backfill-Script nachgetragen: `npm run backfill:places` (dry-run) + `--apply` zum Schreiben
- Auto-Umrechnung zwischen Währungen ist **nicht** Teil des MVP — Folge-Issue

### Besuchsstatus (✅ / ⏭️)

- Auf jeder POI-Card ein **Visit-Status-Button** mit Zyklus-Verhalten
- **1. Klick:** Offen → ✅ **Besucht** (olive-grün)
- **2. Klick:** Besucht → ⏭️ **Übersprungen** (gedämpft)
- **3. Klick:** zurück auf Offen
- Am Ende der Reise siehst du auf einen Blick was geschafft wurde und was für nächstes Mal bleibt
- Sync zwischen allen Geräten via Firestore

### Kommentare / Notizen pro POI (💬)

- Auf jeder POI-Card ein **💬-Badge mit Zähler** (grau + disabled wenn keine Kommentare)
- Klick auf das Badge ODER auf ✏️ → Edit-Modal → Abschnitt **„Notizen & Kommentare"**
- Freitext eingeben → **„Senden"** (oder **Cmd/Ctrl+Enter**) → Kommentar erscheint mit Familien-Farbpunkt + Name + Zeit
- **Nur eigene Kommentare** (von „Meine Familie") sind löschbar (Trash-Icon bei Hover)
- Threaded discussion für Tipps ("Reservieren!", "Früh kommen!", "Nicht die Carbonara") — sync zwischen allen Geräten

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

- **„Route optimieren"**-Button: nutzt Google Directions API mit `optimizeWaypoints: true`
- Berücksichtigt Homebase als Start- und Endpunkt
- Benötigt mindestens 3 Stops (alle mit Koordinaten)
- Feedback: _„Route optimiert — N km kürzer! 🎉"_ oder _„Reihenfolge ist bereits optimal! 👌"_

### KI-Tagesplan (✨ AI Tagesplan)

- **Prompt-Eingabe:** Natürliche Sprache, z.B. _„Entspannter Tag in Trastevere mit gutem Essen"_
- **Quick-Tags** (Multi-Select): 🏛️ Kultur, 🍕 Pizza, 🍨 Gelato, 🍝 Trattoria, 🍹 Aperitivo, 👨‍👩‍👧‍👦 Kinderfreundlich, 🌅 Aussicht, 🚶 Wenig laufen
- **Familie auswählen:** Für welche Familie plant die KI (beeinflusst Familien-Zuordnung der neuen POIs)
- **Gemini 2.5 Flash** generiert 4–7 Stops mit:
  - Name (echter Ort in Rom)
  - Kategorie
  - Beschreibung + Begründung
  - Ungefähre Uhrzeit (⏰)
- **Vorschau:** Stops werden als nummerierte Liste gezeigt, einzelne Stops können per ✕ entfernt werden
- **„Übernehmen (N Stops)":** Akzeptierte Stops werden via Google Places verortet (sequentiell mit 400ms Delay), als neue POIs gespeichert und dem Tag zugeordnet
- **Schutz:** Homebase wird nie als Stop eingefügt (Prompt-Regel + defensiver Filter im Code)
- Stops die nicht via Google Places gefunden werden landen in der Inbox

### Tagesbeschreibung

- Nach KI-Plan-Akzeptierung wird eine Zusammenfassung des Tages angezeigt (vom KI generiert)

### Tagesbudget (💰)

- Pro Tag eigene Budget-Karte mit Wallet-Icon
- **Budget** und **Ausgegeben** als einfache Zahlenfelder (manuell aktualisierbar)
- Progress-Bar zeigt Fortschritt: grün → ocker ab 80% → rot wenn überzogen
- Text: _„€80 übrig (€120 von €200)"_ oder _„€30 über Budget"_
- Währung wird aus der Trip-Konfiguration abgeleitet (Italien → €, Japan → ¥, USA → $, UK → £, Schweiz → CHF, sonst €)
- Pro Tag isoliert, Firestore-Sync zwischen allen Geräten
- Leer lassen → keine Progress-Bar, keine Warnung

### Kindgerechte Vorschläge (👶)

- Kollabierbarer Bereich unten im Tagesplan: **„Kindgerechte Vorschläge"**
- **„Vorschläge finden"** → Gemini analysiert die Stops des aktuellen Tages + Homebase und schlägt 3-4 kindgerechte Orte in der Nähe vor: Spielplätze, Gelaterien, Parks, Kinder-Museen, Brunnen, interaktive Kunst
- Jede Card zeigt: Foto, **Kind-Tag** (z.B. Spielplatz / Gelateria / Park), Kategorie, Rating, Adresse, Begründung mit **Bezug zu einem Tages-Stop** („nur 5 Gehminuten vom Pantheon")
- **„Hinzufügen"**-Button legt den POI in der Entdecken-Liste ab (nicht automatisch im Tagesplan — der User fügt ihn manuell via „+ Zum Tag" ein)
- **„Neue Runde"** lädt frische Vorschläge

---

## 3. Settings-Tab

### Reisedaten

- **Von / Bis:** Start- und Enddatum der Reise
- Daraus werden die Tag-Tabs im Reise-Tab berechnet

### Trip-Konfiguration (🌐)

- **Stadt / Land:** Kontext für alle AI-Prompts (Tagesplan, Briefing, Vibes-Suche, Vorschläge). Default: Rom / Italien.
- **Sprache:** In welcher Sprache die AI antwortet (Deutsch / English / Italienisch / Japanisch / Spanisch / Französisch). Default: Deutsch.
- **Kategorien:** Liste der POI-Kategorien pro Trip. Default: 7 Rom-Kategorien (Kultur, Pizza, Gelato, Trattoria, Aperitivo, Instagram, Sonstiges). Eigene hinzufügen (z.B. „Ramen", „Tempel", „Sushi") und entfernen via Pill-Editor. Bekannte Kategorien bekommen automatisch ein Emoji, unbekannte einen 📍-Fallback.
- **„Auf Rom-Default zurücksetzen":** Setzt alles auf die Rom-Werte.
- Bereitet die App auf v3.0 Multi-Trip vor — aktuell reicht ein Trip pro Workspace, ab v3.0 pro Trip konfigurierbar.

### Familien

- **Familien hinzufügen/bearbeiten:** Name + Farbe
- **Farbpalette:** 8 „Dolce Vita Herbst"-Farben (Terracotta, Olive, Ocker, Burgunder, Petrol, Lavendel, Senf, Schiefer)
- Farbe bestimmt die Pin-Farbe auf der Karte
- **Kinder-Info:** Optionales Freitextfeld (z.B. „2 Kinder, 4 und 7 Jahre") — wird dem KI-Planer mitgegeben
- Familie löschen (nur wenn keine POIs zugeordnet, mindestens 1 Familie muss bleiben)

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
- Beide Familien sehen Änderungen sofort (`onSnapshot`-Listener)
- Optimistische UI-Updates (keine Wartezeit auf Server-Bestätigung)
- **Offline-fähig:** Firestore IndexedDB-Persistierung (Multi-Tab)
- Anonyme Authentifizierung (kein Login nötig)
- Shared Workspace über `VITE_FIREBASE_WORKSPACE_ID`

### Wetter

- **Quelle:** Open-Meteo API (kostenlos, kein API-Key nötig)
- 16-Tage-Vorhersage basierend auf Homebase-Koordinaten
- Anzeige in den Tag-Tabs: Wetter-Emoji + Maximaltemperatur (z.B. ☀️ 24°)
- Vollständige WMO-Code-Tabelle (Sonnig bis Gewitter mit Hagel) mit deutschen Labels
- In-Memory-Cache mit 1-Stunde TTL

### Fotos

- **Google Places Fotos** werden automatisch geladen (bei Suche + Karten-Klick)
- **Cloud Function** (`persistPoiPhoto`) kopiert Google-Fotos nach Firebase Storage (CORS-sichere URLs)
- **Fallback:** Kategorie-Emoji als Gradient-Platzhalter wenn kein Foto vorhanden

### AI Review-Zusammenfassungen

- Beim Hinzufügen via **Suche** oder **Karten-Klick** wird parallel eine KI-generierte Zusammenfassung der Google Reviews geholt
- **Quelle:** Google Places API (New) → `editorialSummary` (Fallback) oder `generativeSummary` (wenn verfügbar)
- Anzeige auf der POI-Karte als lila **„Was Gäste sagen"**-Block
- Auch im Map-InfoWindow sichtbar (kursiv)
- **Voraussetzung:** „Places API (New)" muss in der Google Cloud Console aktiviert sein
- **Graceful Fallback:** Wenn nicht aktiviert oder kein Summary verfügbar → Block wird nicht angezeigt, kein Fehler

### PWA (Progressive Web App)

- **Installierbar:** „Zum Startbildschirm hinzufügen" auf iOS und Android
- **Service Worker:** Auto-Update, Workbox-basiert
  - Google Maps APIs: NetworkFirst, 1h Cache, max 50 Einträge
  - Firestore: NetworkFirst, 5min Cache, max 20 Einträge
  - Statische Assets: Precached (JS, CSS, HTML, Fonts)
- **App-Manifest:** Standalone-Modus, Portrait-Orientierung, Custom Icons (192px, 512px maskable, SVG)

### Öffnungszeiten

- Von Google Places übernommen (Wochentagsformat)
- POI-Karte + InfoWindow zeigen heutigen Status: grüner Punkt „Jetzt geöffnet" / roter Punkt „Heute geschlossen"
- Erkennt „24 hours", „closed", „geschlossen"

### Eigener Standort

- Geolocation API mit `watchPosition` (hohe Genauigkeit)
- Blauer pulsierender Punkt auf der Karte
- Wird für keine Berechnung genutzt — nur visuelle Orientierung
- Permission-Verweigerung wird still ignoriert

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
