# Architecture: AI Features (Gemini)

Alle AI-Features nutzen **Gemini 2.5 Flash** via Firebase AI Logic. Kein Client-API-Key nötig — Firebase macht das Routing + Quota-Management. Prompts sind in `src/lib/ai*.ts`-Files.

## Config

- Firebase Console → AI Logic → Gemini aktivieren
- Pro-Call-Kosten laufen über das Firebase-Projekt
- Keine VITE_-Env-Variable nötig auf Client-Seite

Siehe [src/lib/gemini.ts](../../src/lib/gemini.ts) für den Init-Wrapper.

## Feature-Katalog

| Feature | Datei | Trigger | Output |
|---|---|---|---|
| **Vibes-Suche** (NL Search) | [aiNlSearch.ts](../../src/lib/aiNlSearch.ts) | User tippt Vibes-Query | Kriterien-Liste + Places-Query-String |
| **AI Tagesplan** | [aiDayPlanner.ts](../../src/lib/aiDayPlanner.ts) | „AI Tagesplan"-Button im DayPlanner | Liste Stops + Overview-Text |
| **AI Day-Briefing** | [aiDayBriefing.ts](../../src/lib/aiDayBriefing.ts) | Auto bei Tag-Öffnen (wenn fehlt) | Freitext-Briefing für den Tag |
| **AI POI Suggestions** | [aiPoiSuggestions.ts](../../src/lib/aiPoiSuggestions.ts) | AiSuggestionsPanel in POI-Detail | Ähnliche POIs mit Rationale |
| **Kid-Friendly Analysis** | [aiKidFriendlySuggestions.ts](../../src/lib/aiKidFriendlySuggestions.ts) | Button im DayPlanner | Kid-Friendly-Scored Alternativen |
| **Post-Trip Analysis** | [aiPostTripAnalysis.ts](../../src/lib/aiPostTripAnalysis.ts) | Post-Trip-Panel | Rückblick + Empfehlungen für nächsten Trip |
| **Instagram Location Extraction** | [aiInstagramLocationExtractor.ts](../../src/lib/aiInstagramLocationExtractor.ts) | Instagram-Caption-Parsing (#16) | Ortsnamen-Array |

## Prompt-Pattern

Alle Prompts sind strukturiert nach:

1. **Rollen-Context:** „Du bist Reise-Guide für {city}"
2. **Input-Daten:** Trip-Config + existing POIs + user query
3. **Output-Schema:** Strict JSON (oder klare Struktur-Vorgabe)
4. **Anti-Halluzinations-Clauses:** „Nur wenn sicher", „bei Unsicherheit weglassen"

Beispiel — [`aiInstagramLocationExtractor.ts`](../../src/lib/aiInstagramLocationExtractor.ts) erzwingt strict JSON-Array mit Length-Cap + robustem Parser mit Fence-Stripping Fallback.

## Safety & Kosten

- **Gemini 2.5 Flash** ist günstig (~€0.075/1M input tokens, ~€0.30/1M output)
- **Alle Features sind User-triggered** (außer Day-Briefing = per-Day auto) — keine Hintergrund-Pollings
- **Kein Retry-on-Fail** — Gemini-Error → UI-Fehlerbanner, User kann's erneut triggern
- **Cost-Breakdown** aus April-Baseline: <€1/Monat für alle AI-Features zusammen (vgl. ~€35 Maps/Places)

## Trip-Config als Context

Alle Prompts bekommen [`TripConfig`](../../src/settings/types.ts) mit:
- `city`, `country`, `period` (saisonale Hinweise)
- `homebase` (für Proximity-Bias)
- `families` (Kinder-Info für Kid-Friendly-Prompts)

So sind die Prompts nicht hart auf „Rom" codiert — bei v3.0 Multi-Trip (Japan, etc.) funktioniert derselbe Code.

## Testing

AI-Flows sind **nicht im CI getestet** (nicht-deterministisch). Stattdessen:
- E2E-Playwright-Scripts gegen echte API (siehe `e2e/issue-13-vibes-search.e2e.js` et al.)
- Manual-Test-Scripts in `e2e/manual/` für Regression-Checks

## Related Issues

- #13 NL-Search
- #14 AI Day-Briefing
- #15 AI Suggestions-Panel
- #23 Kid-Friendly-Analyse
- #16 Instagram-Location-Extract
- #43 Post-Trip-Analyse
