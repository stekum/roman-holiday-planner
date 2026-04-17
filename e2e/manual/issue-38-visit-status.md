# Test: #38 — Besuchsstatus pro POI (✅ Besucht / ⏭️ Übersprungen)

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Workspace mit ≥1 POI

---

## TC-1: Visit-Status-Button sichtbar

1. Entdecken-Tab → POI-Liste
2. Grid-Ansicht aktiv

**Erwartetes Ergebnis:**
- ✅ Auf jeder POI-Card gibt es einen neuen Button mit **Kreis-Icon** und Text „Offen" (grau)
- ✅ In der Compact-Ansicht: kleiner Icon-only-Button in der Action-Reihe (neben Kommentar-Badge)

---

## TC-2: Zyklus Offen → Besucht → Übersprungen → Offen

1. POI-Card → Visit-Status-Button tippen (1. Klick)

**Erwartetes Ergebnis:**
- ✅ Button wechselt zu ✅ „Besucht", olive-grüner Hintergrund
- ✅ State persistiert sofort nach Firestore

2. Button erneut tippen (2. Klick)

**Erwartetes Ergebnis:**
- ✅ Button wechselt zu ⏭️ „Übersprungen", gedämpftes Grau

3. Button erneut tippen (3. Klick)

**Erwartetes Ergebnis:**
- ✅ Button zurück auf ⚪ „Offen"
- ✅ `visitStatus`-Field in Firestore auf `null` gesetzt (oder entfernt)

---

## TC-3: State persistiert nach Reload

1. Einen POI als „Besucht" markieren
2. Seite neu laden (Cmd+Shift+R)

**Erwartetes Ergebnis:**
- ✅ POI zeigt weiterhin ✅ „Besucht"

---

## TC-4: Sync zwischen Geräten

1. Gerät A: POI X auf „Besucht"
2. Gerät B: gleicher Workspace, gleiche POI-Liste

**Erwartetes Ergebnis:**
- ✅ Gerät B sieht sofort ✅ „Besucht" (Firestore-Listener)

---

## TC-5: Mehrere POIs mit gemischten Status

1. 3 POIs: eine „Offen", eine „Besucht", eine „Übersprungen"

**Erwartetes Ergebnis:**
- ✅ Alle 3 zeigen korrekt ihren eigenen Status
- ✅ Klick auf eine ändert NICHT die anderen
- ✅ Button-Farben klar unterscheidbar (Offen: grau, Besucht: olive, Übersprungen: gedämpft)

---

## TC-6: Status bleibt bei Edit

1. POI „Besucht" markieren
2. ✏️ Edit-Modal öffnen → Titel oder Kategorie ändern → Speichern

**Erwartetes Ergebnis:**
- ✅ Nach Speichern: Visit-Status bleibt auf „Besucht"
- ✅ Kein Verlust des Status durch Edit

---

## TC-7: Status bleibt bei Votes/Likes

1. POI „Besucht" markieren
2. Heart-Button (Like) tippen + Vote-Buttons tippen

**Erwartetes Ergebnis:**
- ✅ Visit-Status bleibt unverändert
- ✅ Alle 3 Buttons (Status/Like/Vote) funktionieren unabhängig

---

## TC-8: Backward-Compat (alte POIs ohne visitStatus)

1. Ein POI der vor #38 existierte

**Erwartetes Ergebnis:**
- ✅ Zeigt „Offen" (Default) — kein Crash bei fehlendem Feld
- ✅ Erster Klick legt visitStatus in Firestore an

---

## TC-9: Accessibility — aria-label

1. Visit-Status-Button inspizieren (Browser-DevTools)

**Erwartetes Ergebnis:**
- ✅ Aktueller aria-label beschreibt nächste Aktion:
  - Offen → „Als besucht markieren"
  - Besucht → „Besucht — zum Überspringen tippen"
  - Übersprungen → „Übersprungen — zum Zurücksetzen tippen"
