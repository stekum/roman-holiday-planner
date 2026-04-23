# Manual Test: fix/multi-trip-rom-leaks

**Ziel:** Alle Rom-hardcoded Leaks in Places-Suche, Weather-API und UX-Texte sind beseitigt. Für einen Nicht-Rom-Trip (z.B. Tokyo) verhalten sich AI-Vorschläge, POI-Suche und Wetter trip-nativ.

**Vorbedingungen:**
- Japan-Workspace existiert (z.B. `japan-mai-26`) mit TripConfig: city="Tokyo", country="Japan", center≈Tokyo, timezone="Asia/Tokyo", currency="JPY"
- Optional Homebase in Tokyo gesetzt

---

## TC-1: Homebase-Picker (PlacesAutocomplete)

1. Japan-Trip aktiv → Settings → Homebase → "Andere Homebase wählen".
2. Suche "Park Hyatt".
3. Ergebnisse erscheinen: **Park Hyatt Tokyo** sollte ganz oben sein.

**Vorher kaputt:** Rom-Hotels wurden priorisiert (ROME_BIAS auf Instagram-Autocomplete).

## TC-2: POI hinzufügen via Places-Suche

1. Entdecken-Tab → FAB (+) → "Suchen".
2. Suche "Sushi Jiro".
3. Ergebnisse: **Sukiyabashi Jiro Ginza** (Tokyo) sollte erscheinen, nicht Rom-Sushi-Restaurants.

## TC-3: AI-Vorschläge (Entdecken-Tab)

1. Entdecken-Tab → KI-Vorschläge generieren.
2. Vorschläge werden als POIs erstellt mit Koordinaten **in Tokyo**, nicht Rom.

**Vorher kaputt:** `textQuery: "${name} Rome"` + ROME_BIAS → Vorschläge mapten immer auf Rom-Places.

## TC-4: Vibes-Suche (AI NL-Search)

1. Entdecken-Tab → FAB → "Vibes-Suche".
2. Eingabe "romantisches Sushi-Restaurant mit Aussicht".
3. Ergebnisse: Tokyo-Restaurants.

## TC-5: Kid-Friendly AI-Panel (Reise-Tab)

1. Reise-Tab → Tag mit Kindern im Familie → Kid-Friendly-Vorschläge generieren.
2. Vorschläge landen als POIs **in Tokyo**, nicht Rom.

## TC-6: Wetter

1. Reise-Tab → Tag-Tabs oben.
2. Temperatur + Icon werden für **Tokyo** angezeigt (ggf. via Homebase-Koordinaten abweichend).
3. Wechsel zum Rom-Trip → Wetter wechselt auf **Rom**-Daten (nicht gecacheter Tokyo-Wert).

**Vorher kaputt:** In-Memory Cache war nur nach Existenz gekeyed; timezone-Parameter war hardcoded `Europe/Rome` → Japan-Tage wurden mit falschem Day-Boundary-Aggregate erfasst.

## TC-7: „Ort verorten"-Modal

1. POI ohne Koordinaten öffnen (Entdecken → Pin-Icon → „Ort verorten").
2. Modal-Subtitel zeigt **"Ort in Tokyo suchen und auswählen"** (city-dynamisch).

## TC-8: AI-Tagesplan Placeholder

1. Reise-Tab → AI-Tagesplan.
2. Textarea-Placeholder zeigt **"Beschreib deinen idealen Tag in Tokyo…"**.

---

## Regression-Check Rom-Trip

1. Wechsle auf Rom-Workspace.
2. TC-1 (Homebase-Picker "Hotel Trastevere") → Rom-Hotels.
3. TC-6 Wetter → Rom-Werte.
4. TC-7 Modal-Subtitel → "Ort in Rom suchen".

Alle Rom-Trip-Flows müssen unverändert funktionieren — Rom ist nur nicht mehr hardcoded.
