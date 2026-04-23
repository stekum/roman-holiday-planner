# Manual Test: #73 — CityConfig (Places-Geocoding für Map-Center, Timezone, Currency)

**Ziel:** Workspace-spezifische Stadt-Konfiguration mit Places-Autocomplete. Map zentriert sich auf der gewählten Stadt, nicht mehr hart auf Rom. Currency + Timezone werden aus Land abgeleitet.

**Test-Umgebung:** Beta (`https://holiday-planner-beta.web.app/`) nach Auto-Deploy.

**Bauaktionen:** ROME_CENTER entfernt, CityConfig-Felder (center, defaultZoom, timezone, currency) in `TripConfig` ergänzt. CityPicker mit Places-API-Autocomplete. TripConfigEditor-Erweiterung.

---

## Test-Cases

### TC-1: Rom-Trip — keine Regression

**Vorbedingungen:** Aktiver Rom-Trip (z.B. `default`/`roma2026`) mit bestehender Config (Land "Italien").

1. App öffnen → Entdecken-Tab.
2. Map zentriert sich auf Rom (~41.89 N, 12.49 E).
3. Settings → Trip-Konfiguration:
   - "Stadt aus Places befüllen" ist als Input sichtbar
   - Stadt: "Rom", Land: "Italien", Sprache: "Deutsch"
   - **Währung** Dropdown zeigt `EUR € — Euro`
   - **Map-Mittelpunkt**: `41.8925, 12.4853` (Default)
   - **Zeitzone**: `Europe/Rome`
   - Aktive-Währung-Zeile unten: `€ (EUR)`

**Erwartet:** Alles rendert unverändert, keine Crashes. Map springt nicht irgendwo hin.

### TC-2: Japan-Trip über Places befüllen

1. Switcher → Japan-Trip (oder neu anlegen, z.B. `japan-may26`).
2. Settings → Trip-Konfiguration.
3. In "Stadt aus Places befüllen" tippe "Tokyo" → Dropdown zeigt Locality-Treffer.
4. Tokyo (Japan) klicken.
5. Felder füllen sich:
   - Stadt: "Tokyo"
   - Land: "Japan"
   - Währung: `JPY ¥ — Japanische Yen`
   - Map-Mittelpunkt: ~35.6762, 139.6503
   - Zeitzone: `Asia/Tokyo`
6. Entdecken-Tab → Map zentriert sich auf Tokyo.

**Erwartet:** Rundlauf Places-Suche → Feld-Befüllung → Map-Sprung funktioniert.

### TC-3: Settings manuell übersteuern

1. Nach TC-2: Settings öffnen.
2. Land-Feld auf "Deutschland" umschreiben (manuell).
3. Währung-Dropdown auf `CHF` ändern.
4. Save (automatisch bei Change).
5. Reload.
6. Werte persistieren: Land "Deutschland", Währung "CHF" angezeigt.

**Erwartet:** Manuelle Overrides nicht von Places-Defaults überschrieben. Werte halten.

### TC-4: Unbekannte Stadt

1. Settings → CityPicker.
2. "Timbuktu" eingeben.
3. Dropdown zeigt Treffer (Mali) → klicken.
4. Land "Mali" befüllt. Währung-Dropdown steht auf `EUR` (Default-Fallback), Timezone leer/undefined.

**Erwartet:** Kein Crash bei unbekannten Ländern. Fallbacks greifen.

### TC-5: Homebase hat Vorrang vor Trip-Center

1. Settings → Homebase setzen (z.B. Hotel in Rom, Paris oder Tokyo).
2. Entdecken-Tab.

**Erwartet:** Map zentriert auf Homebase-Koordinaten, nicht auf TripConfig-Center. (Bestehendes Verhalten — sollte nicht regrediert sein.)

### TC-6: Währung in POI-Cards

1. Trip mit Currency `JPY` (Japan).
2. Entdecken-Tab → POI mit Preis-Info.
3. PoiCard zeigt `¥` statt `€`.
4. Zurück zu Rom-Trip → POI-Cards zeigen wieder `€`.

**Erwartet:** Währungssymbol wechselt mit Trip.

### TC-7: Alte Firestore-Docs ohne Geo-Felder

**Vorbedingungen:** Ein Workspace der vor #73 angelegt wurde (hat `settings.tripConfig` ohne `center`/`timezone`/`currency`). Das entspricht produktiven Rom-Workspaces.

1. Diesen Workspace öffnen.
2. Map zeigt Rom-Default-Center. Settings zeigt EUR als Währung. Europe/Rome als Timezone.
3. Keine Firestore-Errors beim Lesen.

**Erwartet:** Resolver `getTripConfig()` liefert Defaults für fehlende Felder. Kein Migration-Bedarf.

---

## Scope-Klarstellungen

**Nicht Teil von #73:**
- Kartendarstellung als Preview im Editor (würde separate Issue)
- Präzise IANA-Timezone via Google TimeZone API (wir nehmen Heuristik pro Land)
- Currency-Feinabstimmung für Länder ausserhalb der Heuristik (EUR/JPY/USD/GBP/CHF)
- Migrations-Skript für bestehende Workspaces (nicht nötig — Defaults decken ab)

**Bekannt/accepted:**
- "Timbuktu"-Test: bei Ländern ausserhalb unserer Heuristik fällt Timezone auf `undefined` zurück (im Editor als "nicht gesetzt" angezeigt). User kann nicht manuell ein IANA-String eingeben — Feld ist read-only. Bei Bedarf folgt das in späterem Issue.
