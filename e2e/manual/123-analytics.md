# Test: #123 — Google Analytics (GA4 via Firebase Analytics)

**Ziel:** Nutzungsdaten in GA4 landen, sobald `VITE_GA_MEASUREMENT_ID` gesetzt
ist. Ohne ID tracking silently no-op. Opt-Out per localStorage.

**Vorbedingungen**
- `VITE_GA_MEASUREMENT_ID=G-XXXXXXXX` in `.env.local` (lokal) bzw. Repo-Secret
  (Beta/Prod)
- GA4-Property in Firebase-Projekt aktiv
- DevTools Network-Tab offen, Filter auf `google-analytics.com` oder `collect`

---

## TC-1: Kein Measurement-ID → kein Tracking

1. `.env.local` (lokal): `VITE_GA_MEASUREMENT_ID=` auskommentieren / leeren
2. `npm run dev`
3. Mehrere Aktionen: Tab wechseln, POI liken, KI-Tagesplan generieren

**Erwartetes Ergebnis:**
- ✅ **0 Requests** an `google-analytics.com`
- ✅ Keine Console-Warnung / Keine Crash
- ✅ App läuft identisch

---

## TC-2: Measurement-ID gesetzt → Events landen

1. `.env.local`: `VITE_GA_MEASUREMENT_ID=G-XXX…` mit echtem Wert
2. `npm run dev`
3. Folgende Aktionen triggern (+ Network-Tab beobachten):
   - Tab Entdecken ↔ Reise ↔ Settings wechseln → automatisches **`page_view`**
   - FAB + → Suchen → POI hinzufügen → **`add_poi`** (`method: "search"`)
   - FAB + → Vibes-Suche → POI → **`add_poi`** (`method: "ai-search"`)
   - POI liken (Herz-Button) → **`poi_liked`**
   - DayPlanner → „Optimieren" auf Tag mit Stops → **`route_optimized`**
   - DayPlanner → „AI Tagesplan" → generieren → **`ai_plan_generated`**
   - „Zur Tour hinzufügen" → **`ai_plan_accepted`**

**Erwartetes Ergebnis:**
- ✅ Pro Aktion ein Request an `https://www.google-analytics.com/g/collect` (oder
  `region1.google-analytics.com`) — mit `en=<event_name>` im Query-String
- ✅ GA4 Dashboard → Realtime zeigt die Events live (ggf. 10-30s Verzögerung)

---

## TC-3: Opt-Out per localStorage

1. Browser-Console: `localStorage.setItem('disableAnalytics', '1')` + reload
2. Aktionen wie TC-2 triggern

**Erwartetes Ergebnis:**
- ✅ **0 Requests** an GA
- ✅ Console: keine Errors

Opt-Out rückgängig: `localStorage.removeItem('disableAnalytics')` + reload.

---

## TC-4: Beta trackt nach Merge

1. Nach Merge + Beta-Deploy: Secret `VITE_GA_MEASUREMENT_ID` im Repo
   eingerichtet
2. Beta-URL öffnen, login, Aktion
3. GA4 Realtime checken

**Erwartetes Ergebnis:**
- ✅ Events aus Beta erscheinen in GA4 mit `stream_id` der Web-Property

---

## Non-Goals dieser Runde

- Kein Cookie-Consent-Banner (DSGVO-optional laut Issue; Opt-Out via
  localStorage reicht vorläufig)
- Kein User-ID-Tracking (nur anonyme Events)
- Kein erweitertes E-Commerce-Tracking
