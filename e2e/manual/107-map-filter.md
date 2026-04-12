# Test: #107 — Entdecken-Filter filtert auch Karten-Pins

**Vorbedingungen**
- App läuft (`npm run dev`)
- Mindestens 5 POIs vorhanden, davon ≥2 verschiedene Kategorien
- Tab **Entdecken** ist aktiv

---

## TC-1: Kategorie-Filter → Map zeigt nur gefilterte Pins

1. Tab **Entdecken** öffnen — alle Pins sichtbar
2. Auf **„Filter"** tippen → Filter-Panel öffnet sich
3. Kategorie **„Pizza"** antippen
4. Karte beobachten

**Erwartetes Ergebnis:**
- ✅ Nur Pizza-Pins bleiben auf der Karte sichtbar
- ✅ Alle anderen Pins (Kultur, Gelato etc.) verschwinden von der Karte
- ✅ Die Liste darunter zeigt ebenfalls nur Pizza-Einträge
- ✅ Zähler zeigt „2/38 Orte" (oder entsprechende gefilterte Zahl)

**Fehlerbild (vor Fix):**
- ❌ Karte zeigte weiterhin alle 38 Pins, obwohl Filter aktiv war

---

## TC-2: Filter zurücksetzen → alle Pins wieder sichtbar

1. Aktiven Filter aus TC-1 via **„Alle zurücksetzen"** löschen

**Erwartetes Ergebnis:**
- ✅ Alle Pins erscheinen wieder auf der Karte
- ✅ Liste zeigt alle POIs

---

## TC-3: Familie-Filter → Map zeigt nur Pins der gewählten Familie

1. Filter-Panel öffnen
2. Eine Familie auswählen (z.B. „Brandstetter")
3. Karte beobachten

**Erwartetes Ergebnis:**
- ✅ Nur Pins der Familie Brandstetter (in deren Farbe) auf der Karte
- ✅ Pins der anderen Familie ausgeblendet

---

## TC-4: Trip-Tab nicht beeinflusst

1. Filter in Entdecken aktivieren (z.B. „Pizza")
2. Tab **Reise** wechseln
3. Karte im Trip-Tab beobachten

**Erwartetes Ergebnis:**
- ✅ Im Trip-Tab sind ALLE POIs auf der Karte sichtbar (Filter gilt nur im Entdecken-Tab)
- ✅ Route-Planung funktioniert unverändert

---

## TC-5: Kombinierter Filter (Kategorie + Familie)

1. Kategorie „Trattoria" UND Familie „Kummert" gleichzeitig aktivieren

**Erwartetes Ergebnis:**
- ✅ Karte zeigt nur POIs, die beides erfüllen
- ✅ Filter-Badge zeigt „2" (zwei aktive Filter)
