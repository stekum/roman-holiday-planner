# Test: #179 — Firestore-Enrichment als Cache-SoT

**Ziel:** Wenn ein POI in Firestore bereits `priceRange`/`aiSummary`/`primaryType`
hat, soll eine Places-API-Enrichment-Anfrage für denselben `placeId` **keine**
Netzwerk-Calls mehr auslösen. Source-of-Truth für Enrichment ist Firestore.

**Vorbedingungen**
- App läuft (`npm run dev` oder Beta)
- Login durch
- DevTools Network-Tab offen, Filter auf `places.googleapis.com/v1/places`

---

## TC-1: Initial-Load primt Cache

1. DevTools Network-Tab clearen, Filter auf Places-New-API
2. Hard-Reload (Cmd+Shift+R)
3. Nach vollständigem App-Load: POI-Liste anschauen

**Erwartetes Ergebnis:**
- ✅ Beim Laden der POI-Liste werden Enrichment-Daten aus Firestore angezeigt
  (Cuisine-Tags, Preis-Range, AI-Summary auf Cards) — ohne neue Places-API-Calls
- ✅ **0 Requests** gegen `places.googleapis.com/v1/places/*`

---

## TC-2: Add-Existing-PlaceId → kein redundanter Call

Szenario: User fügt per „Auf Karte" einen POI hinzu, dessen `placeId` bereits in
der bestehenden POI-Liste existiert (Duplikat-Versuch).

1. FAB + → **Auf Karte** → Google-POI tippen, der bereits als existierender POI
   in der Liste ist (z.B. ein bekanntes Restaurant aus der Liste nochmal
   anklicken)
2. Bottom-Sheet öffnet mit Details

**Erwartetes Ergebnis:**
- ✅ **0 neue** `places.googleapis.com/v1/places/*`-Calls
  (Cache hit aus Firestore-Prime)
- ℹ️ Der `PlacesService.getDetails`-Call bleibt (anderer Endpoint, für URL/Opening
  Hours) — nur das `places.googleapis.com/v1/places/{id}`-Endpoint ist gecacht

---

## TC-3: Neue placeId → echter Fetch

1. FAB + → **Vibes-Suche** → Suche mit echter API (`localStorage.DEBUG_MAPS='1'`
   falls im Dev) → einen POI auswählen
2. Falls der POI noch nicht in Firestore: Cache-Miss erwartet

**Erwartetes Ergebnis:**
- ✅ Genau **1 Request** gegen `places.googleapis.com/v1/places/{placeId}` für
  den neuen POI (legitimer first-time-fetch)
- ✅ Nach dem Save landet er in Firestore mit Enrichment
- ✅ Nächster Reload: TC-1-Verhalten (Cache aus Firestore)

---

## TC-4: POI ohne Enrichment wird nicht geprimt

Szenario: POI in Firestore hat `placeId` aber keine enrichment-Felder (z.B.
manuell hinzugefügter POI).

1. POI öffnen, der kein `priceRange` / `aiSummary` hat
2. Falls Detail-View den Places-Enrichment triggert:

**Erwartetes Ergebnis:**
- ✅ Ein echter Places-API-Call wird gemacht (weil Prime geskippt hat, da
  kein substantielles Feld vorhanden war)
- ✅ Danach gleiche placeId: Cache hit aus Session-Cache (#178)

---

## TC-5: Backfill-Script bleibt unabhängig funktional

1. Terminal: `node scripts/backfill-places-enrichment.mjs` (oder entsprechenden
   npm-Script)
2. Script lädt POIs, fetcht Enrichment, schreibt zurück in Firestore

**Erwartetes Ergebnis:**
- ✅ Script läuft normal durch (nutzt nicht den Browser-Cache, sondern fetcht
  direkt via Admin-SDK/HTTP)
- ✅ Nach Durchlauf enthalten alle POIs Enrichment-Felder
