# Test: #23 — Kindgerechte Aktivitäten-Vorschläge

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Firebase, Google Maps und Gemini konfiguriert
- Reise-Zeitraum gesetzt (Settings)
- Mindestens eine Familie
- **Reise-Tab** mit mindestens einem Tag der 1+ Stop hat (für sinnvolle Kontext-Suggestions)

---

## TC-1: Panel sichtbar im Reise-Tab

1. **Reise**-Tab öffnen → einen Tag auswählen
2. Bis unter den Tages-Header / RouteSummary scrollen

**Erwartetes Ergebnis:**
- ✅ Neuer kollabierbarer Abschnitt **„Kindgerechte Vorschläge"** mit **Baby**-Icon
- ✅ Subtext: „Für diesen Tag mit N Stop(s)" oder „Plane erst ein paar Stops" (0 POIs)
- ✅ Default: zusammengeklappt

---

## TC-2: Panel aufklappen + Idle-State

1. Auf den Header tippen

**Erwartetes Ergebnis:**
- ✅ Panel klappt auf, Chevron zeigt hoch
- ✅ Einladungstext: „Spielplätze, Gelaterien, Parks & Kinder-Museen in der Nähe eurer Stops"
- ✅ Button **„Vorschläge finden"** (Ocker-farben)

---

## TC-3: Vorschläge für Tag mit Stops

1. Ein Tag mit 2-4 POIs (z.B. Kolosseum, Forum Romanum, Pantheon)
2. Panel aufklappen → **„Vorschläge finden"**

**Erwartetes Ergebnis:**
- ✅ Loading-Spinner mit „Suche kindgerechte Stops…"
- ✅ Nach 10-25s: 3-4 Suggestion-Cards
- ✅ Jede Card zeigt: Foto, Name, **Kind-Tag** (Spielplatz/Gelateria/Park/Museum...) + Kategorie-Emoji, Rating, Adresse, Begründung, Hinzufügen-Button
- ✅ Begründungen beziehen sich auf die Tages-Stops ("nur 5 Min vom Pantheon", "perfekte Gelato-Pause nach dem Kolosseum")

---

## TC-4: Begründungen qualitativ gut

1. TC-3 ausgeführt
2. Kind-Tags + Begründungen lesen

**Erwartetes Ergebnis:**
- ✅ Kind-Tags sind passend (Spielplatz, Gelateria, Park, Kinder-Museum, Brunnen, Aussichtspunkt, Interaktive-Kunst)
- ✅ Begründungen nennen konkrete Stops des Tages
- ✅ Orte sind real (nicht halluziniert) — Rating/Adresse von Places da
- ✅ Keine Duplikate der Tages-Stops

---

## TC-5: Vorschlag hinzufügen

1. Auf einer Card **„Hinzufügen"** tippen

**Erwartetes Ergebnis:**
- ✅ Card verschwindet sofort
- ✅ Neuer POI in der POI-Liste (Entdecken-Tab) sichtbar mit Foto/Rating/Adresse
- ✅ Pin auf der Karte
- ✅ POI gehört der eigenen Familie (myFamilyId)
- ✅ POI ist **nicht automatisch** in den Tagesplan eingefügt — das macht der User manuell via „+ Zum Tag"

---

## TC-6: Alle hinzugefügt → Empty State

1. TC-5 wiederholen bis alle Cards weg

**Erwartetes Ergebnis:**
- ✅ Text „Alle Vorschläge hinzugefügt ✓" + **„Neue laden"**-Button
- ✅ Klick → neue Runde

---

## TC-7: Neue Runde

1. Bei vorhandenen Vorschlägen **„Neue Runde"** tippen

**Erwartetes Ergebnis:**
- ✅ Loading-State, dann andere (oder teils neue) Vorschläge
- ✅ Bestehende Tages-Stops werden wieder ausgefiltert

---

## TC-8: Tag ohne Stops

1. Einen leeren Tag wählen
2. Panel aufklappen → **„Vorschläge finden"**

**Erwartetes Ergebnis:**
- ✅ AI liefert generelle kindgerechte Ziele in der Nähe der Homebase
- ✅ Keine halluzinierten Stop-Bezüge in den Begründungen
- ✅ Keine Fehler

---

## TC-9: Panel-Zustand beim Tagwechsel

1. Tag A: Vorschläge geladen (5 Cards)
2. In DayTabs auf Tag B wechseln
3. Zurück auf Tag A

**Erwartetes Ergebnis:**
- ✅ Panel auf Tag A zeigt wieder Idle-Zustand (oder alte Cards) — akzeptabel, aber konsistent
- ✅ Kein Crash, kein Mix aus Tag-A-Cards in Tag-B-Ansicht

_Hinweis: State bleibt komponenten-lokal pro Mount. Bei unmount/remount (z.B. Tag-Tab-Wechsel falls DayPlanner re-mountet) ist Reset ok._

---

## TC-10: Gemini-Fehler

_(Schwer künstlich zu reproduzieren — eher passiv beobachten)_

**Erwartetes Ergebnis:**
- ✅ Fehlerbox mit Message + „Nochmal versuchen"-Button
- ✅ App bleibt stabil

---

## TC-11: Coexistence mit anderen AI-Blöcken

1. Tag mit 3+ Stops
2. Sowohl **AI Tagesplan** (oben), **AI Tages-Briefing** (oben) als auch **Kindgerechte Vorschläge** (unten) nutzen

**Erwartetes Ergebnis:**
- ✅ Alle drei AI-Blöcke funktionieren unabhängig
- ✅ Keine gegenseitigen Überschreibungen / State-Races
- ✅ UI-mäßig klar getrennt (Tagesplan oben, Briefing unten Tagesplan, Kind-Vorschläge unten Briefing)
