# Test: Transit-Tage zwischen Städten (#78)

**Testen auf:** Beta (https://holiday-planner-beta.web.app/) → nach Validierung Prod

**Voraussetzung:** Trip mit ≥2 Homebases in unterschiedlichen Städten (z.B. Tokyo + Kyoto), Trip-Range deckt min 3 Tage ab.

---

## TC-1: Transit-Tag anlegen via Settings

1. Settings-Tab → Sektion „Transit-Tage" — leer beim ersten Mal
2. „Transit-Tag hinzufügen" klicken
3. Felder befüllen:
   - Datum: einer der Trip-Tage (z.B. 2026-05-27)
   - Von Stadt: „Park Hyatt Tokyo" (Datalist sollte Homebase-Namen vorschlagen)
   - Nach Stadt: „The Westin Miyako Kyoto"
   - Mode: „Shinkansen"
   - Abfahrt: 10:15
   - Ankunft: 12:35
   - Info: „Sitz 5A, Reservation #JP-887"
4. „Hinzufügen" klicken
5. **Erwartung:** Eintrag erscheint in der Liste. Felder sind alle inline-editierbar (gleicher Look wie HomebasesEditor).

## TC-2: Editieren & Löschen

1. Bei einem existierenden Transit-Tag jedes Feld ändern → speichert sofort (Firestore-Realtime)
2. Mülleimer-Icon → Eintrag verschwindet
3. **Erwartung:** Reihenfolge in der Liste = chronologisch (sortiert nach Datum, nicht nach Anlage-Zeitpunkt)

## TC-3: Reise-Tab zeigt Transit-Card statt POI-Programm

1. Reise-Tab öffnen, zu dem Transit-Datum navigieren (DayTabs)
2. **Erwartung:**
   - **Karte oben ist ausgeblendet** (kein Map-Container, Body beginnt direkt mit DayTabs)
   - DayTabs sichtbar mit allen Tagen
   - Statt „Tagestour" + POI-Liste eine **Transit-Card**: Zug-Icon, „Reisetag" Heading, „Park Hyatt Tokyo → The Westin Miyako Kyoto", Mode-Pill, Ab/An-Zeiten, Reservation-Box
   - Kein AI-Tagesplan-Button, kein Routenoptimierungs-Button, kein Briefing-Button (alle nicht erreichbar weil DayPlanner-Body durch TransitDayCard ersetzt)
3. Auf einen Nicht-Transit-Tag wechseln → Karte + POI-Programm wieder normal sichtbar

## TC-4: Tab-Navigation bleibt funktional

1. Auf Transit-Tag bist du
2. Über DayTabs auf Vor-/Nach-Transit-Tag wechseln → POI-Liste, Karte, AI-Buttons sind wieder da
3. Zurück zum Transit-Tag → wieder TransitDayCard

## TC-5: Zwei Workspace-Mitglieder sehen denselben Transit-Tag

1. Owner legt Transit-Tag an
2. Member-Account (anderer Browser/Account) öffnet denselben Trip
3. **Erwartung:** Member sieht den Transit-Tag in seinem Reise-Tab (Firestore-Realtime via `settings.transitDays`)
4. Member kann den Transit-Tag NICHT in seinen Settings editieren — wait, aktuell kann jeder Member alles in Settings ändern (Rules erlauben Member-Update auf Settings). Owner-only-Lock auf TransitDays ist nicht implementiert (war auch nicht im Issue-Scope).

## TC-6: Mobile-Smoke

1. Auf iPhone Beta öffnen, Transit-Tag aktiv
2. **Erwartung:** TransitDayCard ist responsive — keine horizontalen Overflows, Buttons groß genug für Touch.

---

## Notes

- AI-Plan + Day-Briefing sind auf Transit-Tagen bewusst nicht reachable. Wenn ein Reise-Briefing gewünscht ist, separates Issue.
- `settings.transitDays` ist optional — bestehende Workspaces ohne dieses Feld zeigen für jeden Tag das normale POI-Programm.
- Transit-Tage werden nicht in `tripPlan` (POI-Reihenfolge) materialisiert — bleiben rein orthogonale Settings-Liste. Folge: wenn Stefan einen Tag versehentlich sowohl als Transit-Tag UND mit POIs anlegt, gewinnt der Transit-Tag in der UI; die POIs bleiben in Firestore aber unsichtbar (Cleanup nicht nötig — wenn Transit-Tag wieder entfernt wird, sind POIs wieder da).
