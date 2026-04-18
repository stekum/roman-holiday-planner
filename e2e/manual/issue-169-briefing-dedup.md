# Test: #169 — AI Tages-Briefing Dedup + Wrong-Day-Fix

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Gemini API-Key im Project aktiv (`VITE_GEMINI_API_KEY`)
- Mindestens 2 Tage mit Stops geplant (z.B. Tag 1 und Tag 6)

---

## TC-1: Briefing für Tag 6 erwähnt nicht "erster Tag"

1. Reise-Tab → Tag 6 aktivieren (mind. 2 Stops drauf)
2. Button **„Briefing erzeugen"** klicken
3. Kurz warten bis Text erscheint

**Erwartetes Ergebnis:**
- ✅ Briefing-Text beginnt MIT Bezug auf Tag 6 oder das Datum (z.B. „Heute, am 15. April, erwartet euch…")
- ✅ Text enthält NICHT „erster Tag" oder „Tag 1"
- ✅ Stops im Text matchen die auf Tag 6 geplanten POIs

---

## TC-2: Briefing rendert nur einmal (kein Duplikat-Absatz)

1. Auf einem beliebigen Tag Briefing erzeugen
2. Card mit AI-Briefing betrachten

**Erwartetes Ergebnis:**
- ✅ Der Briefing-Text erscheint GENAU EINMAL
- ✅ Keine identischen Absätze wiederholt darunter
- ✅ DevTools Console zeigt ggf. Warning `[AI Briefing] Dedup-pass hat Content gekuerzt…` wenn Gemini Duplikate liefert — das ist OK, Dedup hat gegriffen

---

## TC-3: Bestehende Briefings mit Duplikaten regenerieren

1. Auf einem Tag mit altem, duplizierten Briefing: **„Briefing aktualisieren"** klicken
2. Neues Briefing sollte den alten korrupten Text überschreiben

**Erwartetes Ergebnis:**
- ✅ Neuer Text sauber, einmal
- ✅ Firestore `dayBriefings.<dayIso>` enthält neuen deduplizierten Text (optional via Firebase-Console prüfen)

---

## TC-4: Mehrere Tage nacheinander — kein Cross-Contamination

1. Tag 1 Briefing erzeugen
2. Tab auf Tag 3 wechseln, Briefing erzeugen
3. Tab auf Tag 6 wechseln, Briefing erzeugen
4. Zwischen den Tagen zurückspringen

**Erwartetes Ergebnis:**
- ✅ Jeder Tag zeigt seinen eigenen Briefing-Text
- ✅ Beim Tag-Wechsel rendert die Card den Text des jeweiligen Tages (nicht den vorherigen)
- ✅ Keine Race-Condition wenn schnell umgeschaltet wird während Gen-Call läuft

---

## TC-5: Diagnostic-Log bei Gemini-Duplikat (dev-only)

1. DevTools Console offen haben
2. Briefing erzeugen

**Erwartetes Ergebnis:**
- Wenn Gemini saubere Antwort liefert: kein Log
- Wenn Gemini Duplikat liefert: Warning `[AI Briefing] Dedup-pass hat Content gekuerzt. day=2026-04-15. raw=NNNch, final=NNNch. Erste 160ch von raw: …`
- Log hilft bei zukünftiger Diagnose ob Bug am Modell oder Prompt liegt
