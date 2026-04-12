# Test: AI Review-Zusammenfassungen auf POI-Cards (#59)

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Voraussetzung:** Places API (New) muss in der Google Cloud Console aktiviert sein (zusaetzlich zur klassischen Places API).

---

## TC-1: Neuer POI via Suche — AI Summary wird angezeigt

1. Entdecken-Tab oeffnen
2. "+" Button → "Suchen"
3. Nach einem bekannten Restaurant suchen (z.B. "Da Enzo al 29 Roma")
4. Ergebnis auswaehlen
5. Kategorie + Familie setzen → "Hinzufuegen"
6. **Erwartung:** Auf der POI-Karte erscheint ein lila Block "Was Gaeste sagen" mit einer AI-generierten Zusammenfassung der Google Reviews
7. **Erwartung:** Auf der Karte Pin antippen → InfoWindow zeigt die Zusammenfassung als kursiver lila Text

## TC-2: Neuer POI via Karten-Klick — AI Summary wird angezeigt

1. "+" Button → "Auf Karte"
2. Auf ein bekanntes Restaurant/Cafe auf der Karte tippen (Google POI mit Icon)
3. Warten bis Google-Place-Daten geladen sind
4. "Hinzufuegen"
5. **Erwartung:** POI-Karte zeigt "Was Gaeste sagen" Block

## TC-3: Fallback wenn Places API (New) nicht aktiviert

1. POI via Suche hinzufuegen (auch wenn Places API New nicht aktiviert ist)
2. **Erwartung:** POI wird normal hinzugefuegt, kein "Was Gaeste sagen" Block (graceful fallback, kein Fehler)

## TC-4: Bestehende POIs — kein AI Summary

1. Bestehende POIs in der Liste pruefen
2. **Erwartung:** Kein "Was Gaeste sagen" Block (Feld wurde nicht nachtraeglich befuellt)

## TC-5: Manuell / Instagram hinzugefuegte POIs — kein AI Summary

1. POI manuell oder via Instagram hinzufuegen
2. **Erwartung:** Kein "Was Gaeste sagen" Block (kein placeId vorhanden)
