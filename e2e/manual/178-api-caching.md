# Test: #178 — API-Call-Caching (fetchPlaceEnrichment + RoutePolyline)

**Ziel:** Redundante Google-API-Calls (Directions, Places) per Session-Cache
deduplizieren. Verifikation primär über Network-Tab, nicht UI.

**Vorbedingungen**
- App läuft (`npm run dev`)
- Mindestens 3 POIs in heutiger Tour (Trip mit Homebase + 2+ Stops)
- DevTools-Network-Tab offen, Filter auf `places.googleapis.com` bzw.
  `maps.googleapis.com/maps/api/directions`

---

## TC-1: Directions-Cache greift bei Tag-Switch

1. Tab **Reise** öffnen
2. Network-Tab öffnen, Filter auf `directions` setzen, Log clearen
3. Zu einem Tag mit Route wechseln → **3 Directions-Calls** erwartet (Main + 2 Home-Legs)
4. Zu einem anderen Tag wechseln → weitere Calls (neue Stops)
5. **Zurück zum ersten Tag** wechseln

**Erwartetes Ergebnis:**
- ✅ Beim Zurückwechseln: **0 neue Directions-Calls** (alle aus Cache)
- ❌ Fehlerbild: 3 Calls pro Tag-Switch → Cache greift nicht

---

## TC-2: Places-Enrichment-Cache bei wiederholtem POI-Open

1. Tab **Entdecken** öffnen
2. Network-Tab, Filter auf `places.googleapis.com/v1/places`
3. Ersten POI öffnen (Detail-View) → **1 Places-Call** erwartet
4. POI schließen, anderen POI öffnen → neuer Call
5. **Ersten POI erneut öffnen**

**Erwartetes Ergebnis:**
- ✅ Beim zweiten Öffnen des ersten POI: **0 neue Places-Calls**
- ❌ Fehlerbild: Jeder POI-Open triggert Call → Cache greift nicht

---

## TC-3: Cache übersteht Parallel-Calls

1. Mehrere Tabs öffnen, die denselben POI enrichmen (z.B. POI-Detail +
   KinderFreundlich-Panel)
2. Network-Tab während App-Load

**Erwartetes Ergebnis:**
- ✅ Nur **1 Places-Call pro placeId**, auch wenn 2 Components gleichzeitig fetchen
- ✅ Beide Components bekommen dasselbe Enrichment-Result

---

## TC-4: Cache bleibt per-Session

1. Nach TC-1/TC-2: Browser-Tab schließen + neu öffnen (Hard-Reload)
2. Erneut denselben Tag/POI öffnen

**Erwartetes Ergebnis:**
- ✅ Erste Calls nach Reload werden wieder gemacht (kein persistenter Cache)
- ✅ Danach wieder Cache-Hit-Verhalten

**Anmerkung:** Persistenter Cache wäre Scope für Firestore-Enrichment-SoT (#179).
