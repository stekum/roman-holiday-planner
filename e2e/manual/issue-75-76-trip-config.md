# Test: #75 + #76 — TripConfig (Stadt/Land/Sprache/Kategorien)

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/)

**Vorbedingungen**
- Firebase, Google Maps, Gemini konfiguriert
- Admin-Zugang (für Settings-Tab)

---

## TC-1: Settings zeigt neue Trip-Konfiguration-Sektion

1. App öffnen → **Settings**-Tab

**Erwartetes Ergebnis:**
- ✅ Neuer Abschnitt **„Trip-Konfiguration"** mit Globe-Icon
- ✅ Unterhalb „Reise-Zeitraum", oberhalb „Deine Unterkunft"
- ✅ Felder sichtbar: **Stadt**, **Land**, **Sprache** (Dropdown), **Kategorien** (Pills)
- ✅ Default-Werte: Rom / Italien / Deutsch / 7 Rom-Kategorien (Kultur, Pizza, Gelato, Trattoria, Aperitivo, Instagram, Sonstiges)

---

## TC-2: Stadt/Land bearbeiten

1. Stadt-Feld: „Rom" → „Tokyo"
2. Land-Feld: „Italien" → „Japan"

**Erwartetes Ergebnis:**
- ✅ Änderung wird sofort nach Firestore persistiert (keine extra Speichern-Button)
- ✅ Reload der Seite: Felder zeigen weiterhin Tokyo/Japan
- ✅ Im Reise-Tab: „AI Tagesplan" bezieht sich jetzt auf Tokyo (nicht Rom) — Prompt-Text der Vorschläge enthält japanische Orte
- ✅ Entdecken-Tab: „AI-Vorschläge" / „Vibes-Suche" suchen in Tokyo, nicht in Rom

---

## TC-3: Sprache wechseln

1. Sprache-Dropdown: Deutsch → English

**Erwartetes Ergebnis:**
- ✅ Wert gespeichert
- ✅ AI-Tagesplan / Briefing / Vorschläge antworten auf Englisch (beim nächsten Gemini-Call)

---

## TC-4: Kategorie hinzufügen

1. Eingabefeld: „Ramen" tippen → Enter ODER „Hinzufügen"-Button

**Erwartetes Ergebnis:**
- ✅ Neuer Pill „🍜 Ramen" erscheint in der Liste
- ✅ Eingabefeld wird geleert
- ✅ In POI-Filter (Entdecken) + Edit-POI-Modal erscheint „Ramen" als Option
- ✅ Duplikat-Vermeidung: „Ramen" ein zweites Mal → keine Änderung

---

## TC-5: Kategorie entfernen

1. Auf einer Pill (z.B. „Instagram") das ✕-Icon klicken

**Erwartetes Ergebnis:**
- ✅ Pill verschwindet
- ✅ In POI-Filter taucht „Instagram" nicht mehr auf
- ✅ Bestehende POIs mit Kategorie „Instagram" zeigen den Namen weiter, aber im Filter-Picker ist sie weg

---

## TC-6: Reset auf Rom-Defaults

1. „Auf Rom-Default zurücksetzen" klicken

**Erwartetes Ergebnis:**
- ✅ Stadt → Rom, Land → Italien, Sprache → Deutsch, Kategorien → Default-7
- ✅ Persistiert sofort nach Firestore

---

## TC-7: Emoji-Fallback für Custom-Kategorien

1. Kategorie „Pasta-Kurs" hinzufügen

**Erwartetes Ergebnis:**
- ✅ Pill zeigt „📍 Pasta-Kurs" (📍-Fallback — nicht in der Emoji-Lookup-Tabelle)
- ✅ Bekannte extensions (Ramen → 🍜, Sushi → 🍣, Tempel → ⛩️, Museum → 🖼️, Shopping → 🛍️, Café → ☕, Natur → 🌳) bekommen passende Emojis

---

## TC-8: Rom-POIs funktionieren weiter (Regression)

1. Mit Default-Config (Rom/Italien/Deutsch): komplett durchtesten was in v1.5 schon da ist:
   - AI Tagesplan erzeugen
   - AI Tages-Briefing erzeugen
   - Vibes-Suche
   - AI-Vorschläge (Entdecken-Tab)
   - Kindgerechte Vorschläge (Reise-Tab)

**Erwartetes Ergebnis:**
- ✅ Alle 5 AI-Features funktionieren weiterhin wie vorher
- ✅ Prompts enthalten „Rom, Italien" dynamisch (statt hardcoded)
- ✅ Keine Regressions im Verhalten

---

## TC-9: Sync zwischen zwei Geräten

1. Gerät A: Settings → Stadt auf „Paris" setzen
2. Gerät B (gleicher Workspace): Settings öffnen

**Erwartetes Ergebnis:**
- ✅ Gerät B zeigt automatisch „Paris" (Firestore-Listener)
- ✅ AI-Features auf Gerät B verwenden ab sofort Paris-Kontext

---

## TC-10: Backward-Compat bei fehlendem tripConfig

1. Workspace-Dokument direkt editieren (Firestore Console): `settings.tripConfig` löschen
2. App neu laden

**Erwartetes Ergebnis:**
- ✅ TripConfigEditor zeigt Default-Werte (Rom/Italien/Deutsch/7-Rom-Kategorien)
- ✅ AI-Features verwenden Rom-Default (kein Crash, keine leeren Prompts)
- ✅ Sobald der User was ändert, wird `tripConfig` in Firestore angelegt
