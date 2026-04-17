# Test: #15 — AI POI Suggestions basierend auf Favoriten

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Firebase, Google Maps und Gemini konfiguriert
- Mindestens eine Familie in Settings angelegt
- Empfohlen: mindestens 3-5 POIs unterschiedlicher Kategorien (damit das AI-Signal gut ist)

---

## TC-1: Panel sichtbar im Entdecken-Tab

1. App öffnen → **Entdecken**-Tab

**Erwartetes Ergebnis:**
- ✅ Über der POI-Liste erscheint eine Leiste **„AI-Vorschläge"** mit Sparkles-Icon
- ✅ Subtext zeigt "Basierend auf euren N Orten" (N = POI-Count) ODER "Starter-Mischung vorschlagen" (bei 0 POIs)
- ✅ Rechts ein Chevron (zum Aufklappen)
- ✅ Panel ist standardmäßig **zugeklappt**

---

## TC-2: Panel aufklappen + Idle-State

1. Auf die AI-Vorschläge-Leiste tippen

**Erwartetes Ergebnis:**
- ✅ Panel klappt auf, Chevron zeigt jetzt nach oben
- ✅ Darunter erscheint eine Einladung mit Text „Die KI analysiert eure Orte und schlägt passende neue vor." + Button **„Vorschläge generieren"**

---

## TC-3: Vorschläge generieren — Happy Path

1. **„Vorschläge generieren"** tippen
2. Warten (5-20 Sekunden — Gemini + 5× Places TextSearch parallel)

**Erwartetes Ergebnis:**
- ✅ Spinner mit „Analysiere eure POIs…"
- ✅ Nach Abschluss: bis zu 5 **Suggestion-Cards** erscheinen
- ✅ Jede Card zeigt: Foto (oder Kategorie-Emoji als Fallback), Name, Kategorie-Badge, Rating (wenn verfügbar), Adresse, Begründung (kursiv), „Hinzufügen"-Button
- ✅ Unter den Cards ein „Neue Runde"-Button (lädt frische Vorschläge)

---

## TC-4: Begründungen sind sinnvoll

1. TC-3 ausgeführt
2. Begründungen der 5 Cards lesen

**Erwartetes Ergebnis:**
- ✅ Begründungen sind auf Deutsch
- ✅ Jede Begründung bezieht sich erkennbar auf die bestehende POI-Liste (z.B. "Ihr liebt Trattoria mit echter römischer Küche — …")
- ✅ Keine Duplikate bestehender POIs
- ✅ Orte liegen in/um Rom

---

## TC-5: Vorschlag hinzufügen

1. Auf einer Card **„Hinzufügen"** tippen

**Erwartetes Ergebnis:**
- ✅ Card verschwindet sofort aus der Liste (verbleiben 4 Cards)
- ✅ POI erscheint in der normalen POI-Liste darunter mit Name, Foto, Koordinaten, Adresse, Rating
- ✅ Auf der Karte erscheint ein neuer Pin an der korrekten Stelle
- ✅ Der neue POI hat die Familie die du als „meine Familie" gesetzt hast (Standard)

---

## TC-6: Alle Vorschläge hinzufügen → Empty State

1. TC-5 wiederholen bis alle 5 Cards weg sind

**Erwartetes Ergebnis:**
- ✅ Letzte Card weg → Text „Alle Vorschläge hinzugefügt ✓" + Button **„Neue laden"**
- ✅ Klick auf „Neue laden" → wieder Loading-State → neue 5 Cards

---

## TC-7: Neue Runde / Re-Generate

1. Bei vorhandenen Vorschlägen **„Neue Runde"** tippen

**Erwartetes Ergebnis:**
- ✅ Loading-State
- ✅ Andere (oder teils neue) Vorschläge, NICHT identische zur vorherigen Runde (erwartet — AI hat Kreativitäts-Varianz)
- ✅ Bestehende POIs werden erneut aus den Vorschlägen ausgefiltert

---

## TC-8: Panel zuklappen behält State

1. Nach TC-3 (5 Cards geladen)
2. Auf den Header tippen → Panel zuklappen
3. Erneut aufklappen

**Erwartetes Ergebnis:**
- ✅ Die 5 Cards sind noch da (State bleibt im Component, wird nicht verloren)
- ✅ Kein erneuter Gemini-Call

---

## TC-9: Keine Familie ausgewählt

1. Settings → alle Familien löschen (oder Test-User hat keinen myFamilyId)
2. Panel aufklappen → „Vorschläge generieren"

**Erwartetes Ergebnis:**
- ✅ Vorschläge werden generiert + Places-enriched
- ✅ „Hinzufügen"-Button ist **disabled** (opacity 50%)
- ✅ Kein Crash, klares User-Signal dass Familie fehlt

---

## TC-10: Gemini-Fehler — Fallback

_(Schwer künstlich zu reproduzieren — eher passiv beobachten)_

1. Bei instabiler Verbindung / Quota-Problem: Gemini-Call schlägt fehl

**Erwartetes Ergebnis:**
- ✅ Rote Fehlerbox mit Message wie „AI-Vorschlag fehlgeschlagen: …"
- ✅ **„Nochmal versuchen"**-Button
- ✅ App bleibt stabil, keine Konsole-Flut

---

## TC-11: Places-Suche findet nichts

_(Sehr selten — wenn Gemini einen Namen erfindet der Places nicht kennt)_

1. Gemini liefert 5 Vorschläge, aber Places findet nur 3

**Erwartetes Ergebnis:**
- ✅ Es werden 3 Cards gezeigt (unlocated ones werden ausgefiltert)
- ✅ Kein Crash, keine leere Card mit fehlenden Daten

---

## TC-12: 0 POIs vorhanden — Starter-Mischung

1. Settings löschen oder neue Workspace
2. 0 POIs in der Liste
3. Panel aufklappen → „Vorschläge generieren"

**Erwartetes Ergebnis:**
- ✅ Panel-Header zeigt „Starter-Mischung vorschlagen" (statt „Basierend auf euren N Orten")
- ✅ AI liefert eine gute Anfänger-Mischung (Kolosseum, Trevi, eine Pizzeria, eine Gelateria, Kultur-Highlight)
- ✅ Diversifiziert über Kategorien
