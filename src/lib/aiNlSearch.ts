/**
 * AI Natural-Language POI Search — wandelt einen freien "Vibes"-Text
 * ("Romantisches Restaurant mit Terrasse in Trastevere") in eine
 * Places-API-optimierte Suche + extrahierte Kriterien für die UI.
 *
 * Ein Gemini-Call. Kein Re-Ranking, kein Homebase-/Kinder-Kontext — bewusst
 * minimal für den MVP (#13). Kontext-Erweiterung folgt in einem Nachfolge-Issue.
 */

import { getGeminiModel } from './gemini';
import type { TripConfig } from '../settings/types';
import { DEFAULT_TRIP_CONFIG } from '../settings/tripConfig';

export interface AiNlSearchResult {
  /** Optimierter Keyword-Query für Google Places textSearch. */
  placesQuery: string;
  /** Extrahierte Vibes/Kriterien für Chips neben den Ergebnissen. */
  criteria: string[];
  rawText: string;
}

function buildSystemPrompt(cfg: TripConfig): string {
  // Best-Effort englische Stadt-Variante fuer Places-Suche (Places versteht
  // lokale Namen auch, aber Englisch ist robuster)
  const cityEn = cfg.city === 'Rom' ? 'Rome' : cfg.city;
  return `Du bist ein ${cfg.city}-Reise-Experte (${cfg.country}). Ein Nutzer beschreibt auf ${cfg.language} einen Ort (Restaurant, Bar, Sehenswürdigkeit, Café, ...) mit Vibes/Stimmungen statt harter Keywords.

Aufgabe:
1. Erkenne die GRUND-ART des Ortes (restaurant, bar, cafe, gelato, museum, park, ...).
2. Extrahiere CHARAKTERISTIKA (romantic, rooftop, kid-friendly, cheap, authentic, vegan, ...).
3. Erkenne STADTTEILE oder bekannte Ecken in ${cfg.city}.
4. Baue daraus eine optimale Google-Places-Text-Suche auf Englisch.

ANTWORT-FORMAT (strikt JSON, kein Markdown, keine Erklärung):
{
  "placesQuery": "romantic rooftop restaurant Trastevere ${cityEn}",
  "criteria": ["Romantisch", "Dachterrasse", "Trastevere"]
}

Regeln:
- placesQuery MUSS das Wort "${cityEn}" enthalten (sonst findet Places Ergebnisse weltweit).
- placesQuery ist 4-8 Wörter, Englisch, für Google Places Text Search optimiert.
- criteria sind 2-5 kurze Stichworte auf ${cfg.language} für UI-Chips.
- Wenn der Nutzer einen spezifischen bekannten Ort nennt, nimm den Namen direkt.
- Halluziniere KEINE Ortsnamen — die echte Suche macht Google Places.`;
}

export async function aiNlSearch(userQuery: string, tripConfig?: TripConfig): Promise<AiNlSearchResult> {
  const model = getGeminiModel();
  const cfg = tripConfig ?? DEFAULT_TRIP_CONFIG;
  const cityEn = cfg.city === 'Rom' ? 'Rome' : cfg.city;
  const fullPrompt = buildSystemPrompt(cfg) + '\n\nNutzer-Anfrage: ' + userQuery.trim();

  const result = await model.generateContent(fullPrompt);
  let rawText: string;
  try {
    rawText = result.response.text();
  } catch {
    const resp = result.response as unknown as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const parts = resp.candidates?.[0]?.content?.parts ?? [];
    rawText = parts.filter((p) => p.text).map((p) => p.text ?? '').join('');
  }

  const cleanJson = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanJson) as Partial<AiNlSearchResult>;
    let placesQuery = (parsed.placesQuery ?? '').trim();
    const cityPattern = new RegExp(`\\b${cityEn}\\b`, 'i');
    if (placesQuery && !cityPattern.test(placesQuery)) {
      placesQuery += ` ${cityEn}`;
    }
    return {
      placesQuery: placesQuery || `${userQuery.trim()} ${cityEn}`,
      criteria: Array.isArray(parsed.criteria)
        ? parsed.criteria.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 5)
        : [],
      rawText,
    };
  } catch (e) {
    console.error('[AI NL Search] JSON parse failed:', e, '\nRaw:', rawText.slice(0, 300));
    return {
      placesQuery: `${userQuery.trim()} ${cityEn}`,
      criteria: [],
      rawText,
    };
  }
}
