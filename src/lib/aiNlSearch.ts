/**
 * AI Natural-Language POI Search — wandelt einen freien "Vibes"-Text
 * ("Romantisches Restaurant mit Terrasse in Trastevere") in eine
 * Places-API-optimierte Suche + extrahierte Kriterien für die UI.
 *
 * Ein Gemini-Call. Kein Re-Ranking, kein Homebase-/Kinder-Kontext — bewusst
 * minimal für den MVP (#13). Kontext-Erweiterung folgt in einem Nachfolge-Issue.
 */

import { getGeminiModel } from './gemini';

export interface AiNlSearchResult {
  /** Optimierter Keyword-Query für Google Places textSearch. */
  placesQuery: string;
  /** Extrahierte Vibes/Kriterien für Chips neben den Ergebnissen. */
  criteria: string[];
  rawText: string;
}

const SYSTEM_PROMPT = `Du bist ein Rom-Reise-Experte. Ein Nutzer beschreibt auf Deutsch einen Ort (Restaurant, Bar, Sehenswürdigkeit, Café, ...) mit Vibes/Stimmungen statt harter Keywords.

Aufgabe:
1. Erkenne die GRUND-ART des Ortes (restaurant, bar, cafe, gelato, museum, park, ...).
2. Extrahiere CHARAKTERISTIKA (romantic, rooftop, kid-friendly, cheap, authentic, vegan, ...).
3. Erkenne STADTTEILE oder bekannte Ecken in Rom (Trastevere, Monti, Prati, Vatican, Testaccio, Centro Storico, ...).
4. Baue daraus eine optimale Google-Places-Text-Suche auf Englisch.

ANTWORT-FORMAT (strikt JSON, kein Markdown, keine Erklärung):
{
  "placesQuery": "romantic rooftop restaurant Trastevere Rome",
  "criteria": ["Romantisch", "Dachterrasse", "Trastevere"]
}

Regeln:
- placesQuery MUSS das Wort "Rome" enthalten (sonst findet Places Ergebnisse weltweit).
- placesQuery ist 4-8 Wörter, Englisch, für Google Places Text Search optimiert.
- criteria sind 2-5 kurze DEUTSCHE Stichworte für UI-Chips.
- Wenn der Nutzer einen spezifischen bekannten Ort nennt (z.B. "Kolosseum"), nimm den Namen direkt.
- Halluziniere KEINE Ortsnamen — die echte Suche macht Google Places.`;

export async function aiNlSearch(userQuery: string): Promise<AiNlSearchResult> {
  const model = getGeminiModel();
  const fullPrompt = SYSTEM_PROMPT + '\n\nNutzer-Anfrage: ' + userQuery.trim();

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
    if (placesQuery && !/rome|roma\b/i.test(placesQuery)) {
      placesQuery += ' Rome';
    }
    return {
      placesQuery: placesQuery || userQuery.trim() + ' Rome',
      criteria: Array.isArray(parsed.criteria)
        ? parsed.criteria.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 5)
        : [],
      rawText,
    };
  } catch (e) {
    console.error('[AI NL Search] JSON parse failed:', e, '\nRaw:', rawText.slice(0, 300));
    return {
      placesQuery: userQuery.trim() + ' Rome',
      criteria: [],
      rawText,
    };
  }
}
