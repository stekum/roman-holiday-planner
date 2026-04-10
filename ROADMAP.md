# Roadmap

> Feature-Backlog für den Reise-Planer. Organisiert in Themen-Cluster zum Durchstöbern und Picken.
> Items mit `#Issue` haben ein [GitHub Issue](https://github.com/stekum/roman-holiday-planner/issues).
> Neue Issues werden on-demand erstellt wenn ein Feature dran ist.

---

## 🎯 Bereits geplant (GitHub Issues)

### v1.0 — Pre-Trip
| Feature | Size | Issue |
|---|---|---|
| Voting / Wunschliste pro POI | M | #5 |
| Opening Hours auf POI-Cards | S | #6 |
| ~~Wetter-Forecast pro Tag~~ | ~~S~~ | ~~#7~~ ✅ |
| Route Optimizer Button | S | #8 |
| PWA / Installierbarkeit | S | #9 |
| Sort & Filter | S | #10 |
| Walking Time im Tagesplan | S | #11 |

### v1.5 — AI
| Feature | Size | Issue |
|---|---|---|
| AI Route Optimizer (Opening Hours + Tageszeit) | M | #12 |
| Natural Language POI Search via Claude | M | #13 |
| AI Tages-Briefing | M | #14 |
| AI POI Suggestions | L | #15 |
| Smarter Instagram-Import (Caption-Parser) | L | #16 |

---

## 🧒 Familien & Kinder

| Feature | Size | Beschreibung |
|---|---|---|
| **Kid-Friendly-Score** | S | ⭐⭐⭐-Bewertung pro POI (manuell + AI-Vorschlag). Filter nach Kinderfreundlichkeit. |
| **Alters-Filter** | S | „Geeignet ab X Jahren" pro POI. Gladiatorenschule ab 6, Vatikan ab 10. |
| **Pausen-Planer** | M | Automatische Downtime-Slots im Tagesplan nach 2 intensiven Stops. |
| **Kindgerechte Aktivitäten (AI)** | M | AI schlägt Spielplätze, Gelato, kinderfreundliche Stops in der Nähe der Route vor. |
| **Schatzsuche-Modus** | M | Gamification: Kinder sammeln Stempel für besuchte Orte. Motiviert zum Laufen. |

## 🗺️ Navigation & Live-Location

| Feature | Size | Beschreibung |
|---|---|---|
| **Mein Standort** | S | Blauer Punkt auf der Karte via `watchPosition()`. Kein API-Call. |
| **Familien-Radar** | M | Alle sehen sich live auf der Karte. Firebase-synchronisiert. |
| **Quick-Navigate** | S | „Navigieren"-Button → öffnet Google Maps Walking-Directions zum POI. |
| **AR Walking View** | S | Deep-Link zu Google Maps Live View (AR-Pfeile in Kamera-Ansicht). |
| **Tagesroute in Google Maps** | S | URL mit allen Waypoints → volle Google-Maps-Navigation. |

## ✈️ Multi-City / Multi-Trip

| Feature | Size | Beschreibung |
|---|---|---|
| **Multi-Trip Workspaces** | L | Dropdown: „🇮🇹 Rom 2026" / „🇯🇵 Japan 2026". Eigene POIs, Tage, Homebases. |
| **Mehrere Homebases** | M | Hotel Tokyo (Tag 1–5), Ryokan Kyoto (Tag 6–9). Wechselt automatisch per Datum. |
| **Transit-Tage** | M | Spezieller Tag-Typ für Reisetage (Shinkansen Tokyo→Kyoto, Abfahrt 10:15). |
| **Zeitzonen-Awareness** | S | „15:00 in Tokyo (08:00 daheim)". Für Jetlag + Kommunikation. |
| **Lokale Währung** | S | „~¥2,500 / ~€15" auf Cards. Automatische Umrechnung. |

## 🌐 Offline & PWA

| Feature | Size | Beschreibung |
|---|---|---|
| **PWA + Offline-Persistence** | S | manifest.json + Service Worker + Firestore offline cache. Issue #9. |
| **Offline Map Tiles** | L | Kartenausschnitt vorab cachen. Komplex wegen Google-Lizenz. |
| **Offline-Reiseführer (PDF)** | M | Tagesplan als PDF exportieren. Offline lesbar, druckbar. |

## 📸 Reise-Tagebuch

| Feature | Size | Beschreibung |
|---|---|---|
| **Foto-Tagebuch** | L | Fotos pro POI hochladen (Firebase Storage). Timeline am Ende der Reise. |
| **Besuchsstatus** | S | POI als ✅ Besucht / ⏭️ Übersprungen / 📋 Geplant markieren. |
| **Reise-Statistik** | M | „14 Orte besucht, 23.5 km gelaufen, 7× Gelato, Lieblingsort: Da Enzo." |
| **GPS-Tracking** | L | Tatsächlich gelaufene Route im Hintergrund aufzeichnen (opt-in). |

## 🤖 AI-Features (erweitert)

| Feature | Size | Beschreibung |
|---|---|---|
| **AI Tagesplan-Generator** | L | „Generiere einen Tag in Trastevere, 2 Familien, Kinder, 5 Stops, Mittagspause." |
| **NL-Suche mit Kontext** | M | „Kinderfreundliches Restaurant, nicht Pizza, nahe Homebase" → Claude + Places. |
| **AI „Was wir verpasst haben"** | M | Nach der Reise: Vorschläge basierend auf Interessen für nächstes Mal. |

## 🛡️ Sicherheit & Praktisches

| Feature | Size | Beschreibung |
|---|---|---|
| **Notfall-Dashboard** | M | Botschaft, Versicherung, Krankenhaus, Notruf. Offline verfügbar. |
| **Dokumente-Tresor** | M | Reisepass-Kopien, Buchungen, Versicherungsnummer. Firebase Storage. |
| **Packing List** | M | Kategorisiert, pro Person, Templates, kollaborativ. |

## 💰 Budget & Ausgaben

| Feature | Size | Beschreibung |
|---|---|---|
| **Expense Tracker** | L | Betrag, Währung, Kategorie, wer hat bezahlt. Multi-Währung. |
| **Budget pro Tag** | S | Tagesbudget setzen, Restbudget in Echtzeit. |
| **Familien-Split** | M | Am Ende: wer schuldet wem wieviel. |

## 🗳️ Kollaboration

| Feature | Size | Beschreibung |
|---|---|---|
| **Voting / Polls** | M | 👍/👎/🤷 pro Familie pro POI. Issue #5. |
| **Aktivitäts-Feed** | M | Live-Feed: „Stefan hat X hinzugefügt · 3 Min." |
| **Kommentare pro POI** | S | Kollaborativer Thread. Erfahrungen teilen. |

---

## Wettbewerber & Inspiration

[Wanderlog](https://wanderlog.com/) · [WePlanify](https://weplanify.com/) · [TREK](https://github.com/mauriceboe/TREK) · [FamilyTrips](https://familytrips.app/) · [Layla.ai](https://layla.ai/) · [Mindtrip](https://mindtrip.ai/) · [Polarsteps](https://polarsteps.com/) · [GoPlaces](https://goplacesapp.com/) · [TripStash](https://trytripstash.com/) · [TravelSpend](https://travel-spend.com/) · [Japan Travel NAVITIME](https://japanrailplanner.com/)
