# Manual Test — Issue #300: Vibes-Suche (echter Filter + Mehrfach-Add)

**Setup**: App auf `http://localhost:5173/roman-holiday-planner/` (oder Beta-URL), eingeloggt, in einem Trip mit aktiver `tripConfig`. FAB öffnen → "Mit Vibes finden"-Tile.

## 1. Wochentag-Filter wirkt real

**Query**: `Restaurant Trastevere Montag offen`

**Erwartet**:
- Roter Filter-Chip "Filter: Mo geöffnet" erscheint zusätzlich zu den AI-Kriterien-Chips
- Während Filter-Pass läuft: kleiner Spinner + Text "Öffnungszeiten werden geprüft…"
- Resultat-Liste zeigt nur Treffer, deren `regularOpeningHours.periods` einen Eintrag mit `open.day === 1` haben
- DevTools-Console: `places.filter`-Diff sollte differierend sein (vorher 8, nachher z.B. 5)

**Prüfen**: Bei jedem Result manuell auf Google Maps prüfen — montags geöffnet?

## 2. Wochentag 0 = Sonntag

**Query**: `Sunday brunch Rome`

**Erwartet**:
- Filter-Chip "Filter: So geöffnet" (oder "Filter: So ab 11:00 geöffnet" wenn AI Brunch-Heuristik triggert)
- Treffer haben `period.open.day === 0`
- Sonderlich wichtig: kein Off-by-One — wenn ein Café "Mo–Fr 9–18, Sa–So geschlossen" hat → muss aus der Liste fliegen

## 3. Mehrfach-Add ohne Modal-Close

**Query**: beliebig, 3+ Treffer erwartet

**Schritte**:
1. Pick Treffer #1 → Detail-View → "Hinzufügen"
2. Modal bleibt offen, Toast "„<Name>" hinzugefügt"
3. Liste zeigt #1 mit grün-olivem "✓ Hinzugefügt"-Badge, Item leicht ausgegraut
4. Pick Treffer #2 → Detail-View → "Hinzufügen"
5. Toast aktualisiert sich, Liste zeigt #1 + #2 als "Hinzugefügt"
6. Footer-Button-Text wechselte von "Abbrechen" zu "Fertig"
7. Klick "Fertig" → Modal schließt
8. Trip-Plan-Liste enthält **beide** POIs

## 4. Duplicate-Pick

**Schritte**: Treffer #1 picken + addieren. Dann denselben Treffer #1 erneut klicken.

**Erwartet**:
- Detail-View öffnet wieder (User kann z.B. Familie/Kategorie ändern)
- Save erstellt einen **neuen** POI mit eigener `id` (gewollt; User-Intent für Re-Add z.B. mit anderer Familie)
- Set bleibt → Badge bleibt sichtbar, kein Verschwinden

## 5. Fehlende `regularOpeningHours`

**Setup**: Query mit Wochentag-Filter, der einen Place ohne Öffnungszeit-Daten matched (z.B. ein historisches Denkmal).

**Erwartet**: Treffer **bleibt sichtbar** (fail-open) — `isOpenOnDayAt(undefined, …)` returnt `true`. Lieber falsch-positiv als falsch-negativ.

## 6. Toast-Timing

**Erwartet**:
- Toast verschwindet ~2.5s nach Anzeigen
- Wenn ein zweiter Add innerhalb 2.5s passiert: Toast-Text wird **überschrieben**, Timer resettet
- `aria-live="polite"` → Screen-Reader liest die Bestätigung

## 7. AI ohne Wochentag (kein Filter)

**Query**: `Romantisches Restaurant mit Terrasse`

**Erwartet**:
- AI returnt `filters: {}` oder ohne `weekday`
- KEIN Filter-Chip
- KEIN "Öffnungszeiten werden geprüft…"-Spinner
- Pfad A: Verhalten exakt wie heute (1 Places-API-Call, keine Extra-Latenz)

## 8. Backdrop-Close nach 2 Adds

**Schritte**: 2 POIs adden, dann Backdrop oder X-Button klicken (statt "Fertig")

**Erwartet**:
- Modal schließt
- Beide POIs sind im Trip-Plan persistiert (kein Rollback)
- Activity-Feed zeigt 2× "POI hinzugefügt"

## 9. Race-Condition (Stefan-Stress-Test)

**Schritte**: Schnell hintereinander 2 verschiedene Treffer in der Liste klicken (innerhalb <1s).

**Erwartet**:
- `pickTokenRef` greift → Detail-View zeigt **letzten** geklickten Treffer, nicht den mit dem schnellsten `fetchFields`-Roundtrip
- Keine Console-Errors, keine "stale data"-Symptome (z.B. Treffer-Name aus Pick #1 + Adresse aus Pick #2)

## 10. Cost-Vergleich (Console-Spy)

**Setup**: DevTools → Network → filtered auf "places.googleapis.com"

**Pfad A (kein Filter, Query "Romantisches Restaurant Trastevere")**:
- 1 Request: `places:searchText` mit nur Essentials-fields
- Cost-Indikator (X-Goog-Field-Mask Header): nur basic fields

**Pfad B (Filter, Query "Restaurant Trastevere Montag offen")**:
- 1 Request: `places:searchText`
- + bis zu 8 parallele Requests: `places/<id>` mit field=regularOpeningHours
- Cost: ~$0.04 (search) + 8×$0.005 (fetchFields) = ~$0.08/Suche

## Bekannte Limitationen (Out of Scope)

- AI kann Wochentag halluzinieren bei mehrdeutigen Queries → Filter-Chip macht's transparent, fail-open mildert Schäden
- `priceLevel` und `openAt` werden aktuell nur für `weekday`-Pfad mit ausgewertet — kein eigener Filter-Pfad nur für openAt ohne Wochentag (Future-Scope)
- Keine UI um den Filter manuell zu deaktivieren — User muss neue Query ohne Wochentag formulieren
