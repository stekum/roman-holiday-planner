# Test: #167 — Places API (New): priceRange + Cuisine-Tags

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Places API (New) aktiviert in Google Cloud Console
- `VITE_GOOGLE_MAPS_API_KEY` mit aktivem Places-API-(New)-Zugang
- Mindestens 1 POI in der Workspace (vorhandene POIs reichen)
- Für Backfill: `service-account.json` im Projekt-Root

---

## TC-1: Neue POI mit priceRange aus Places API (New)

1. Entdecken → **+** → **Suchen**
2. „Marco Martini Roma" (teures Restaurant in Rom) tippen → Ergebnis wählen → Hinzufügen
3. POI erscheint in POI-Liste (Grid-Ansicht)

**Erwartetes Ergebnis:**
- ✅ Card zeigt ein Preis-Badge im konkreten Format: z.B. **„€100+"** oder **„€90–€100"** (statt nur €€€€)
- ✅ Neben dem Preis-Badge erscheint ein Cuisine-Tag in Ocker: z.B. **„Fine Dining Restaurant"** oder **„Italian Restaurant"**

---

## TC-2: priceRange-Fallback auf price_level-Symbole

1. POI hinzufügen für das Google nur `price_level` (0-4) hat, aber keine `priceRange`
2. Beispiel: kleine Trattoria ohne konkrete Preisangabe

**Erwartetes Ergebnis:**
- ✅ Card zeigt **„€€€"** oder „€€" — Symbol-Fallback greift
- ✅ Cuisine-Tag kann trotzdem vorhanden sein

---

## TC-3: Kein Preis-Badge bei freien Orten

1. POI hinzufügen: Park, Brücke, öffentlicher Platz ohne Preis (z.B. Piazza Navona)

**Erwartetes Ergebnis:**
- ✅ Kein Preis-Badge sichtbar
- ✅ Cuisine-Tag evtl. vorhanden (z.B. „Plaza")

---

## TC-4: Währung folgt TripConfig

1. Settings → Trip-Konfiguration → Land auf **Japan**
2. Zurück in POI-Liste

**Erwartetes Ergebnis:**
- ✅ Bestehende €-Badges werden zu ¥-Badges wenn Places API den JPY-CurrencyCode nicht liefert
- ✅ Neue POIs via Suchen in Japan liefern native JPY-Beträge (z.B. „¥1500–¥3000")
- ✅ Symbol-Fallback nutzt ¥ wo passend

---

## TC-5: Backfill-Dry-Run

1. Terminal: `npm run backfill:places` (ohne --apply)

**Erwartetes Ergebnis:**
- ✅ Ausgabe listet für jeden POI mit placeId ob er upgedatet würde
- ✅ Summary am Ende: Total, withPlaceId, needsBackfill, fetched, failed, would-update
- ✅ KEIN Firestore-Write passiert
- ✅ Hint „Fuer echtes Backfill: --apply Flag hinzufuegen"

---

## TC-6: Backfill-Apply

**🚨 Security-Vorbereitung (einmalig):**

Der Standard-API-Key (`VITE_GOOGLE_MAPS_API_KEY`) ist HTTP-Referrer-restricted → Server-Calls vom Backfill-Skript werden mit 403 geblockt (siehe Script-Output bei Dry-Run wenn alle Fetches failen).

Zwei Wege:

**Option A (empfohlen): separater Backfill-Key**
1. Cloud Console → APIs & Credentials → „Create credentials" → API Key
2. Name: z.B. „Backfill Server"
3. Application restriction: **IP addresses** → deine Heim-IP
4. API restriction: nur **Places API (New)** aktivieren
5. Als env var übergeben: `GOOGLE_MAPS_API_KEY=<neu> npm run backfill:places -- --apply`
6. Nach Backfill-Ende: diesen Key **deaktivieren/löschen** wenn nicht mehr benötigt

**Option B (Notlösung): Referrer-Restriction am Prod-Key temporär entfernen**
1. Cloud Console → Credentials → `VITE_GOOGLE_MAPS_API_KEY` → Restrictions → „None"
2. `npm run backfill:places -- --apply`
3. **NACH Erfolg SOFORT wieder setzen:** Restrictions → „HTTP referrer" → `https://stekum.github.io/roman-holiday-planner/*` + `http://localhost:5173/*`
4. Das Script erinnert in seiner Endausgabe explizit daran

**Erwartetes Ergebnis des Backfills:**
- ✅ Output zeigt `✓` statt `~` pro POI
- ✅ Rate-Limit: 250ms zwischen Requests (keine API-Quota-Fehler)
- ✅ Nach Abschluss: `updated`-Zähler in Summary
- ✅ Script-Endausgabe enthält Security-Erinnerung zum Restrictions-Reset
- ✅ App-Reload: Alte POIs zeigen jetzt priceRange + Cuisine-Tag

**🚨 Security-Nachbearbeitung — Pflicht:**
- ☐ Restrictions am Key wieder gesetzt (oder separater Key deaktiviert)
- ☐ Cloud Console → Credentials prüfen: kein unrestricted Key im Projekt

---

## TC-7: Backfill idempotent

1. Backfill ein zweites Mal laufen lassen (Apply)

**Erwartetes Ergebnis:**
- ✅ Alle POIs werden als „skipped (already)" gezählt
- ✅ Keine Places-API-Calls
- ✅ `updated: 0`

---

## TC-8: Cuisine-Tag visuell

1. POI mit Cuisine-Tag in Grid-Ansicht betrachten

**Erwartetes Ergebnis:**
- ✅ Tag erscheint als **kleines Pill** unten neben anderen Metadaten
- ✅ Stil: Ocker-Hintergrund, weißer Text, UPPERCASE, kleine Tracking-Letters
- ✅ Kein Tag in Compact-Ansicht (bewusst minimal)

---

## TC-9: Regression — existierende Flows

1. Alle bestehenden Add-Flows durchgehen:
   - Suchen → Ergebnis wählen → Hinzufügen
   - Map-Klick auf Google-POI → Hinzufügen
   - Vibes-Suche → Ergebnis → Hinzufügen
   - AI-Vorschläge → Hinzufügen
   - Kindgerechte Vorschläge → Hinzufügen
2. Aus jedem Flow einen POI hinzufügen

**Erwartetes Ergebnis:**
- ✅ Alle Flows funktionieren weiter
- ✅ priceRange + Cuisine werden wo möglich gespeichert
- ✅ Keine TypeScript/Runtime-Errors

---

## TC-10: Backward-Compat

1. POI der vor #167 existiert (hat kein priceRange/primaryType Feld)
2. Edit-Modal öffnen, speichern ohne Änderung

**Erwartetes Ergebnis:**
- ✅ Card zeigt priceLevel-Fallback (wenn priceLevel da) oder kein Badge
- ✅ Kein Cuisine-Tag bis Backfill gelaufen ist
- ✅ Kein Crash
