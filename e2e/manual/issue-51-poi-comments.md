# Test: #51 — Kommentare / Notizen pro POI

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Angemeldet, Workspace mit ≥1 POI
- „Meine Familie" in Settings gesetzt (sonst ist Kommentar-Input disabled)

---

## TC-1: Comment-Badge auf POI-Card (leer)

1. Entdecken-Tab → POI-Liste

**Erwartetes Ergebnis:**
- ✅ Jede POI-Card zeigt ein 💬-Icon mit Zahl (default `0`)
- ✅ Bei 0 Kommentaren: Icon grau + disabled (kein Klick-Effekt)

---

## TC-2: Kommentar hinzufügen

1. POI-Card → ✏️ „Bearbeiten" klicken
2. Im Edit-Modal scrollen zu **„Notizen & Kommentare"**
3. Placeholder-Text lesen: „War da gestern, Carbonara göttlich, ABER 45 min Wartezeit."
4. Eigenen Text tippen: _„War lecker, aber Terrasse hat gefehlt."_
5. **„Senden"** klicken (oder Cmd+Enter)

**Erwartetes Ergebnis:**
- ✅ Kommentar erscheint sofort in der Liste
- ✅ Mit Familien-Farbpunkt + Familienname + Zeit („heute, 14:23")
- ✅ Textfeld wird geleert
- ✅ Beim Schließen des Modals: POI-Card zeigt jetzt `💬 1` (aktiv, klickbar)

---

## TC-3: Mehrere Kommentare, Reihenfolge

1. 3 verschiedene Kommentare hinzufügen

**Erwartetes Ergebnis:**
- ✅ Alle 3 sichtbar in Einfüge-Reihenfolge (ältester oben, neuester unten)
- ✅ POI-Card zeigt `💬 3`

---

## TC-4: Eigenen Kommentar löschen

1. Edit-Modal → Kommentar von der eigenen Familie
2. Mit Maus drüber (Hover) → Trash-Icon erscheint rechts
3. Drauf klicken

**Erwartetes Ergebnis:**
- ✅ Kommentar verschwindet
- ✅ POI-Card-Badge reduziert sich um 1
- ✅ Andere Kommentare bleiben

---

## TC-5: Fremden Kommentar NICHT löschen können

1. Eine andere Familie hat einen Kommentar hinterlassen (z.B. via 2. Gerät)
2. Eigenes Gerät öffnet Edit-Modal

**Erwartetes Ergebnis:**
- ✅ Trash-Icon erscheint NICHT bei fremden Kommentaren (auch nicht bei Hover)
- ✅ Nur eigene Kommentare sind löschbar

---

## TC-6: Klick auf Badge öffnet Modal

1. POI-Card mit ≥1 Kommentar
2. Auf das 💬-Badge klicken (nicht auf Pencil)

**Erwartetes Ergebnis:**
- ✅ Edit-Modal öffnet sich
- ✅ Kommentar-Sektion ist sichtbar (evtl. Scrollen nötig)

---

## TC-7: Keine Familie gesetzt

1. Settings → Meine Familie auf „nicht gesetzt" (falls möglich, oder neuer User ohne myFamily)
2. POI editieren → Kommentare

**Erwartetes Ergebnis:**
- ✅ Kommentar-Input-Feld disabled mit Placeholder „Setze erst ‚Meine Familie' in Settings"
- ✅ „Senden"-Button disabled
- ✅ Bestehende Kommentare werden trotzdem angezeigt

---

## TC-8: Sync zwischen Geräten

1. Gerät A: Kommentar zu POI X hinzufügen
2. Gerät B (gleicher Workspace): POI X öffnen

**Erwartetes Ergebnis:**
- ✅ Gerät B sieht den Kommentar sofort (Firestore-Listener)
- ✅ Badge-Count stimmt überein

---

## TC-9: Cmd+Enter-Shortcut

1. Edit-Modal → Kommentar-Textarea fokussieren
2. Text tippen
3. **Cmd+Enter** (Mac) oder **Ctrl+Enter** (Win)

**Erwartetes Ergebnis:**
- ✅ Kommentar wird gesendet
- ✅ Enter alleine macht nur Zeilenumbruch (kein Versenden)

---

## TC-10: Backward-Compat (POI ohne comments-Feld)

1. POI der vor #51 existierte (comments === undefined in Firestore)

**Erwartetes Ergebnis:**
- ✅ Badge zeigt `💬 0`, disabled
- ✅ Edit-Modal → leere Liste + Empty-Placeholder
- ✅ Neuer Kommentar funktioniert → comments-Array wird angelegt
