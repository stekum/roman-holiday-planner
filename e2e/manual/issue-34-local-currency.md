# Test: #34 — Lokale Währung auf POI-Cards

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Places API (klassisch) aktiviert
- TripConfig gesetzt (Default: Rom/Italien → €)

---

## TC-1: Preis-Badge bei neuen POIs mit Google price_level

1. Entdecken → **+** → **Suchen**
2. Tippe z.B. „Gucci Roma" oder ein bekannter Luxus-Ort → Ergebnis wählen → Hinzufügen
3. POI erscheint in der Liste

**Erwartetes Ergebnis:**
- ✅ POI-Card zeigt Preis-Badge (z.B. **€€€€** für price_level 4)
- ✅ In Reihe mit Rating + Distance
- ✅ Nicht sichtbar wenn Google keinen price_level liefert

---

## TC-2: Verschiedene Preis-Stufen

1. Mehrere POIs hinzufügen:
   - Street-Food (billig) → **€** (level 1)
   - Mittelklasse-Restaurant → **€€** (level 2)
   - Fine-Dining → **€€€** oder **€€€€**
   - Freier Park → kein Badge (level 0 oder null)

**Erwartetes Ergebnis:**
- ✅ Badge-Länge entspricht price_level (1-4 Symbole)
- ✅ Level 0 / null → kein Badge
- ✅ Über 4 gecapped

---

## TC-3: Währung wechselt mit TripConfig

1. Settings → Trip-Konfiguration → Land auf **Japan** setzen
2. Zurück auf Entdecken-Tab

**Erwartetes Ergebnis:**
- ✅ Alle POI-Cards mit priceLevel zeigen jetzt **¥¥¥** statt €€€
- ✅ Budget-Card im Reise-Tab zeigt auch ¥
- ✅ Reset auf Italien → zurück zu €

---

## TC-4: Existierende POIs ohne priceLevel

1. Ein alter POI (vor #34) ohne `priceLevel`-Feld

**Erwartetes Ergebnis:**
- ✅ Kein Badge angezeigt (kein Crash)
- ✅ Rating + andere Daten bleiben
- ✅ Erneutes Hinzufügen über Suche würde priceLevel nachziehen

---

## TC-5: AI-Vorschläge + Kindgerechte Vorschläge

1. Entdecken → **AI-Vorschläge** → generieren
2. Mehrere Vorschläge akzeptieren
3. Reise-Tab → **Kindgerechte Vorschläge** → generieren → akzeptieren

**Erwartetes Ergebnis:**
- ✅ Alle via AI hinzugefügten POIs haben priceLevel wenn Google Places es liefert
- ✅ Badge erscheint auf den neuen Cards

---

## TC-6: Vibes-Suche

1. Entdecken → **+** → **Vibes-Suche** → z.B. „Romantisches Restaurant Trastevere"
2. Ergebnis wählen → Hinzufügen

**Erwartetes Ergebnis:**
- ✅ priceLevel übernommen (bei guten Restaurants oft level 2-3)
- ✅ Badge sichtbar auf der neuen Card

---

## TC-7: Map-Klick auf Google POI

1. Karte → auf einen Google-POI (Restaurant-Symbol) klicken → Sheet öffnet
2. Hinzufügen

**Erwartetes Ergebnis:**
- ✅ priceLevel aus getDetails übernommen
- ✅ Badge sichtbar

---

## TC-8: Länder-spezifische Währungssymbole

| Land | Erwartetes Symbol |
|---|---|
| Italien / (default) | € |
| Japan | ¥ |
| USA / United States | $ |
| UK / England | £ |
| Schweiz | CHF |

---

## TC-9: Compact vs. Grid View

1. Compact-View (List-Icon): Badge bei kleinerer Zeile
2. Grid-View: Badge unter dem Titel neben Rating

**Erwartetes Ergebnis:**
- ✅ In beiden Views sichtbar + korrekt positioniert
- ✅ Styling passt zur jeweiligen Card-Größe

---

## TC-10: Backward-Compat

1. Alte POIs ohne priceLevel behalten ihre Darstellung
2. priceLevel === 0 → kein Badge (free)
3. priceLevel === null → kein Badge
