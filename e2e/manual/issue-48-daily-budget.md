# Test: #48 — Tagesbudget mit Restbudget-Anzeige

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Reise-Zeitraum gesetzt
- Mindestens ein Tag mit/ohne POIs vorhanden

---

## TC-1: Budget-Karte sichtbar im Reise-Tab

1. **Reise**-Tab → einen Tag auswählen
2. Runterscrollen

**Erwartetes Ergebnis:**
- ✅ Neuer Abschnitt **„Tagesbudget"** mit Wallet-Icon
- ✅ Unter RouteSummary/Briefing, über Kindgerechte Vorschläge
- ✅ Zwei Input-Felder: **Budget** + **Ausgegeben**, beide leer (Placeholder „200" und „0")
- ✅ Währungs-Symbol entspricht Trip-Config-Land (Italien → €)

---

## TC-2: Budget setzen

1. Budget-Input: **200** eingeben → irgendwo anders klicken (blur)

**Erwartetes Ergebnis:**
- ✅ Value persistiert (bleibt beim Reload)
- ✅ Noch kein Progress-Bar (weil ausgegeben = 0)
- ✅ Text: _„€200 übrig (€0 von €200)"_

---

## TC-3: Ausgaben eintragen, Restbudget

1. Ausgegeben: **45** → blur
2. Ausgegeben: **120** → blur

**Erwartetes Ergebnis:**
- ✅ Progress-Bar füllt sich (grün — olive), passend zum %
- ✅ Text: _„€80 übrig (€120 von €200)"_ bei 60%
- ✅ Echtzeit-Update ohne Reload

---

## TC-4: Warnung bei ≥80%

1. Ausgegeben: **165** eingeben → blur

**Erwartetes Ergebnis:**
- ✅ Badge rechts oben: ⚠️ „82%" in Ocker-Farbe
- ✅ Progress-Bar wechselt zu Ocker
- ✅ Text weiterhin normal: _„€35 übrig (€165 von €200)"_

---

## TC-5: Überzogen

1. Ausgegeben: **230** → blur

**Erwartetes Ergebnis:**
- ✅ Badge: ⚠️ **„Überzogen"** in Terracotta
- ✅ Progress-Bar Terracotta, cappt bei 100% visuell
- ✅ Text: _„**€30 über Budget** (€230 von €200)"_ in Rot

---

## TC-6: Reset auf 0

1. Beide Felder leeren (Budget/Ausgegeben)

**Erwartetes Ergebnis:**
- ✅ Progress-Bar verschwindet (keine Daten mehr)
- ✅ Kein Warning-Badge

---

## TC-7: Per-Tag isoliert

1. Tag A: Budget 200, Ausgegeben 50
2. Tag B wählen
3. Zurück zu Tag A

**Erwartetes Ergebnis:**
- ✅ Tag B zeigt eigenes Budget (leer bei erstem Öffnen)
- ✅ Tag A behält 200/50
- ✅ Kein Cross-Over zwischen Tagen

---

## TC-8: Sync zwischen Geräten

1. Gerät A: Tag X → Ausgegeben auf €120
2. Gerät B: gleicher Tag öffnen

**Erwartetes Ergebnis:**
- ✅ Gerät B sieht €120 sofort (Firestore-Listener)
- ✅ Progress-Bar + Warnung aktuell

---

## TC-9: Währung via TripConfig

1. Settings → Trip-Konfiguration → Land: **Japan**
2. Zurück in Reise-Tab

**Erwartetes Ergebnis:**
- ✅ Budget-Card zeigt **¥** statt €
- ✅ Text-Format angepasst

---

## TC-10: Backward-Compat (kein dayBudgets-Field in Firestore)

1. Workspace-Doc hat keine `dayBudgets` Map (alte Daten)
2. App neu laden

**Erwartetes Ergebnis:**
- ✅ Budget-Card zeigt leere Inputs, keine Bar, kein Warning
- ✅ Erste Eingabe erzeugt `dayBudgets` Map in Firestore
