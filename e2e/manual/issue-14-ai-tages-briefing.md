# Test: #14 — AI Tages-Briefing

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Firebase, Google Maps und Gemini sind konfiguriert
- Mindestens ein Reisetag ist gesetzt
- Fuer den Testtag sind mindestens 2 POIs im Tab **Reise** eingeplant

---

## TC-1: Briefing fuer einen Tag erzeugen

1. Tab **Reise** oeffnen
2. Einen Tag mit mindestens einem geplanten Stop auswaehlen
3. Auf **„Briefing erzeugen"** tippen
4. Warten, bis der Ladezustand verschwindet

**Erwartetes Ergebnis:**
- ✅ Ein Block **„AI Tages-Briefing"** erscheint
- ✅ Der Text ist auf Deutsch und fasst Wetter, Tagescharakter und praktische Tipps zusammen
- ✅ Der bestehende Block **„AI Tagesplan"** bleibt unveraendert

---

## TC-2: Briefing bleibt nach Reload erhalten

1. TC-1 ausfuehren
2. Seite neu laden
3. Wieder in den Tab **Reise** wechseln
4. Den gleichen Tag ansehen

**Erwartetes Ergebnis:**
- ✅ Das erzeugte Briefing ist weiterhin sichtbar
- ✅ Kein erneuter Klick auf **„Briefing erzeugen"** ist noetig

---

## TC-3: Briefing aktualisieren

1. Einen Tag mit vorhandenem Briefing oeffnen
2. Auf **„Briefing aktualisieren"** tippen

**Erwartetes Ergebnis:**
- ✅ Der Button zeigt waehrenddessen einen Ladezustand
- ✅ Nach Abschluss bleibt genau ein Briefing-Block sichtbar
- ✅ Der Text darf sich aktualisieren, ohne den AI-Tagesplan-Overview zu ueberschreiben

---

## TC-4: Tag ohne Stops

1. Einen leeren Tag auswaehlen
2. Die Aktionsleiste im Reise-Tab ansehen

**Erwartetes Ergebnis:**
- ✅ Der Briefing-Button ist deaktiviert
- ✅ Es erscheint kein Fehler
- ✅ Die bestehende Leere-Zustand-Karte bleibt unveraendert

---

## TC-5: AI Tagesplan und Briefing bleiben getrennt

1. Fuer einen Tag zuerst **„AI Tagesplan"** verwenden und einen Plan akzeptieren
2. Danach **„Briefing erzeugen"** klicken

**Erwartetes Ergebnis:**
- ✅ Es gibt zwei getrennte Inhalte:
  - **AI Tages-Briefing**
  - **AI Tagesplan**
- ✅ Der Briefing-Text ersetzt nicht den gespeicherten Overview-Text des AI Tagesplans

---

## TC-6: Fehlender Wetterkontext

1. Einen Tag testen, bei dem kein Forecast verfuegbar ist oder die Wetteranfrage fehlschlaegt
2. **„Briefing erzeugen"** klicken

**Erwartetes Ergebnis:**
- ✅ Briefing kann trotzdem erzeugt werden
- ✅ Der Text halluziniert keine exakten Wetterdaten
- ✅ Es erscheint hoechstens eine vorsichtige Formulierung ohne Wetterdetails

---

## TC-7: Sync zwischen zwei Geraeten

1. Auf Geraet A ein Briefing fuer einen Tag erzeugen
2. App auf Geraet B im gleichen Workspace oeffnen
3. Den gleichen Tag ansehen

**Erwartetes Ergebnis:**
- ✅ Das Briefing erscheint auch auf Geraet B
- ✅ Kein separater Re-Generate-Schritt ist noetig
