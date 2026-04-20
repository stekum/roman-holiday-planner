import { getGeminiModel } from './gemini';
import type { TripConfig } from '../settings/types';
import { DEFAULT_TRIP_CONFIG } from '../settings/tripConfig';

interface ExtractContext {
  caption: string;
  title?: string;
  tripConfig?: TripConfig;
}

/**
 * #16: Extrahiert Ortsnamen aus einer Instagram-Caption via Gemini.
 *
 * Output-Schema: JSON-Array von Ortsnamen-Strings, z.B.
 *   ["Da Enzo al 29", "Trastevere"]
 *
 * Leeres Array wenn kein Ort erkennbar. Keine Halluzination erlaubt.
 */
export async function extractLocationsFromCaption(
  context: ExtractContext,
): Promise<string[]> {
  const cfg = context.tripConfig ?? DEFAULT_TRIP_CONFIG;
  const combined = [context.title, context.caption].filter(Boolean).join('\n\n').trim();
  if (!combined) return [];

  const prompt = [
    `Du extrahierst Ortsnamen aus Instagram-Posts ueber eine Reise nach ${cfg.city} (${cfg.country}).`,
    '',
    'EINGABE (Titel + Caption):',
    combined,
    '',
    'AUFGABE:',
    `- Identifiziere ALLE konkreten Orte die in ${cfg.city} existieren koennten (Restaurants, Cafes, Sehenswuerdigkeiten, Viertel, Plaetze, Museen, Bars).`,
    '- Generische Begriffe NICHT extrahieren (z.B. "Strand", "Pizza", "Sonne", "Urlaub").',
    '- Nur Namen die wirklich im Text stehen — keine Halluzination.',
    '- Bei Unsicherheit: lieber weglassen.',
    '',
    'ANTWORT:',
    '- Strictly JSON-Array von Strings.',
    '- Beispiel bei Match: ["Da Enzo al 29", "Trastevere"]',
    '- Beispiel bei keinem Match: []',
    '- KEIN Fliesstext, KEINE Erklaerung, KEINE Markdown-Fences.',
  ].join('\n');

  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const raw = (() => {
    try {
      return result.response.text();
    } catch {
      return '';
    }
  })();

  // Strip possible markdown fences
  const cleaned = raw
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 120)
      .slice(0, 8); // safety cap
  } catch {
    // If Gemini returned prose despite instruction, best-effort recovery:
    // find first [...] block
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 8);
        }
      } catch {
        /* give up */
      }
    }
    return [];
  }
}
