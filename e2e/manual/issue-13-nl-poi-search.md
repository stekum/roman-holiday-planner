# Test: #13 — AI Natural Language POI Search (Vibes-Suche)

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Firebase, Google Maps und Gemini sind konfiguriert
- Google Places API (classic) ist aktiviert
- Mindestens eine Familie ist in den Settings angelegt

---

## TC-1: Vibes-Tile im Menu sichtbar

1. Auf den **+ FAB** unten rechts tippen
2. Das Bottom-Sheet "Ort hinzufügen" erscheint

**Erwartetes Ergebnis:**
- ✅ Fünf Tiles sichtbar: **Suchen**, **Vibes-Suche**, **Auf Karte**, **Manuell**, **Instagram**
- ✅ Das **Vibes-Suche**-Tile hat ein Funkel-Icon (Sparkles)
- ✅ Unterzeile des Tiles: "Mit KI beschreiben"

---

## TC-2: Einfache Vibes-Suche

1. **Vibes-Suche** öffnen
2. In das Textfeld eingeben: **"Romantisches Restaurant mit Terrasse in Trastevere"**
3. **"Finden"** tippen

**Erwartetes Ergebnis:**
- ✅ Ladezustand mit Spinner + "Sucht…"
- ✅ Nach einigen Sekunden erscheint unter der Eingabe ein Block **"AI hat verstanden"** mit mindestens zwei Chip-Tags (z.B. `Romantisch`, `Terrasse`, `Trastevere`)
- ✅ Darunter steht in kursiv die übersetzte Places-Suche: `Places-Suche: "..." Rome`
- ✅ Eine Ergebnisliste mit bis zu 8 Restaurants erscheint
- ✅ Jedes Ergebnis hat Foto (wenn verfügbar), Name, Adresse und ggf. Sterne-Bewertung

---

## TC-3: Ergebnis auswählen und speichern

1. TC-2 ausführen
2. Eines der Ergebnisse antippen
3. Ansicht wechselt in den Familie/Kategorie/Notiz-Editor
4. Familie auswählen, Kategorie auf **Trattoria** setzen, kurze Notiz ergänzen
5. **Hinzufügen** tippen

**Erwartetes Ergebnis:**
- ✅ Bottom-Sheet schließt sich
- ✅ Der neue POI erscheint im Entdecken-Tab mit dem korrekten Namen
- ✅ Koordinaten, Foto, Rating und Adresse sind übernommen
- ✅ Die Karte zeigt den Pin am richtigen Ort

---

## TC-4: Zurück zur Auswahl

1. TC-2 ausführen
2. Ein Ergebnis antippen → Editor erscheint
3. **Zurück zur Auswahl** tippen

**Erwartetes Ergebnis:**
- ✅ Die Ergebnisliste mit den vorherigen Treffern ist wieder sichtbar
- ✅ Die Kriterien-Chips und die übersetzte Suche sind noch da
- ✅ Man kann einen anderen Ort wählen ohne neu suchen zu müssen

---

## TC-5: Leere Ergebnisse — Fallback

1. **Vibes-Suche** öffnen
2. Etwas sehr Unspezifisches eingeben: **"Ein Platz der absolut nicht existiert in Rom ZZZXXXYYY"**
3. **Finden** tippen

**Erwartetes Ergebnis:**
- ✅ Kriterien-Block ggf. sichtbar, aber
- ✅ Rote Fehlermeldung: _"Keine Treffer für „…". Andere Formulierung probieren?"_
- ✅ App bleibt stabil, kein Hang, keine Konsole-Errors

---

## TC-6: Vibe ohne Ortsangabe

1. **Vibes-Suche** öffnen
2. Eingeben: **"Gelato mit ausgefallenen Sorten"**
3. **Finden** tippen

**Erwartetes Ergebnis:**
- ✅ Chips enthalten mindestens `Gelato` oder ähnliches
- ✅ Ergebnisse sind Eisdielen in Rom (Google Places bias durch `Rome` im Query)
- ✅ Die Places-Suche enthält "Rome" am Ende

---

## TC-7: Bestehender "Suchen"-Flow unverändert

1. Auf **+** → **Suchen** (nicht Vibes-Suche)
2. Wie gewohnt typen: **"Colosseo"**
3. Ergebnis wählen, hinzufügen

**Erwartetes Ergebnis:**
- ✅ Standard-Autocomplete-Flow funktioniert wie vor #13 (kein Regression)
- ✅ Ergebnis wird korrekt gespeichert

---

## TC-8: AI-Antwort kaputt — Fallback

_(Lokal oder via Beta schwer reproduzierbar; eher manuell in devtools testen)_

1. Sehr lange Eingabe mit mehrdeutigem Content → Gemini kann kein sauberes JSON liefern
2. **Finden** tippen

**Erwartetes Ergebnis:**
- ✅ Fallback greift: `placesQuery = <ursprünglicher Text> + " Rome"`
- ✅ Ergebnisse werden trotzdem angezeigt (so Google Places etwas findet)
- ✅ Keine Chips (leeres `criteria`-Array)
- ✅ Kein Absturz, kein leerer Screen
