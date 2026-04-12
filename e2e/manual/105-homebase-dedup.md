# Test: #105 — Homebase wird nicht als doppelter POI gespeichert

**Vorbedingungen**
- App läuft (`npm run dev`)
- Homebase ist in Settings gesetzt (z.B. „BMGA | Luxury Home with Patio in Trastevere")
- Gemini API Key ist konfiguriert (AI-Tagesplan-Feature verfügbar)

---

## TC-1: KI-Plan akzeptieren → keine Homebase-Duplikate

1. Tab **Reise** öffnen
2. Einen Tag auswählen
3. Auf **„AI Tagesplan"** tippen
4. Prompt eingeben, z.B. _„Entspannter Tag in Trastevere mit gutem Essen"_
5. Plan generieren lassen
6. In der Stop-Liste prüfen: **Erscheint die Unterkunft als Stop?**
   - ✅ Erwartung: Nein — sie taucht nicht in der nummerierten Liste auf
7. Plan akzeptieren (Button „Zur Tour hinzufügen")
8. Tab **Entdecken** öffnen
9. Liste nach dem Namen der Unterkunft durchsuchen

**Erwartetes Ergebnis:**
- ✅ Kein neuer Eintrag mit dem Namen der Unterkunft in der POI-Liste
- ✅ Die Anzahl der Orte hat sich NICHT um einen Eintrag mit Unterkunfts-Namen erhöht

**Fehlerbild (vor Fix):**
- ❌ Unterkunft erschien als neuer „Sonstiges"-Eintrag ohne Foto

---

## TC-2: Wiederholter Plan → keine kumulierenden Duplikate

1. Schritte aus TC-1 zweimal hintereinander wiederholen (zwei verschiedene Pläne für zwei Tage akzeptieren)
2. Entdecken-Liste prüfen

**Erwartetes Ergebnis:**
- ✅ Kein einziger Unterkunfts-Eintrag in der Liste
- ✅ Anzahl der Orte stimmt mit tatsächlich hinzugefügten Stops überein

---

## TC-3: Tagesplan-Reihenfolge beginnt bei Stop 1 (nicht Homebase)

1. KI-Tagesplan wie in TC-1 erstellen und akzeptieren
2. Tab **Reise** → aktiven Tag ansehen

**Erwartetes Ergebnis:**
- ✅ Erster nummerierter Stop ist ein echter POI (Restaurant, Sehenswürdigkeit etc.)
- ✅ Homebase erscheint nur als gestrichelter Start-Punkt der Route (falls RoutePolyline aktiv)
- ✅ Anzahl der Stops entspricht der Anzahl im KI-Plan (ohne Homebase)
