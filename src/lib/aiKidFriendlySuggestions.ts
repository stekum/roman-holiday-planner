/**
 * AI Kid-Friendly Suggestions — analysiert die Stops eines Tages und
 * schlägt kindgerechte Aktivitäten in der Nähe vor (Spielplätze, Gelato,
 * Parks, Kinder-Museen).
 *
 * Unterschied zu #15 (AI POI Suggestions):
 * - Kontext ist EIN Tag (nicht der Gesamt-Workspace)
 * - Vorschläge sind auf Kinder zugeschnitten
 * - Begründung bezieht sich auf einen konkreten Stop des Tages
 *   (z.B. "5 Min Fußweg vom Pantheon")
 *
 * Ein Gemini-Call. Places-Enrichment geschieht im Consumer.
 */

import { getGeminiModel } from './gemini';
import type { Category, POI } from '../data/pois';
import { CATEGORIES } from '../data/pois';
import type { Homebase } from '../settings/types';

export interface AiKidSuggestion {
  name: string;
  category: Category;
  /** Art der Aktivität in Deutsch, z.B. "Spielplatz", "Gelateria", "Park", "Kinder-Museum". */
  kind: string;
  reason: string;
}

export interface AiKidSuggestionsResult {
  suggestions: AiKidSuggestion[];
  rawText: string;
}

export interface AiKidSuggestionsContext {
  dayPois: POI[];
  homebase?: Homebase;
  familyNames: string[];
  dayLabel?: string;
  count?: number;
}

function buildPrompt(ctx: AiKidSuggestionsContext): string {
  const count = ctx.count ?? 4;
  const parts: string[] = [
    'Du bist ein Rom-Reise-Experte mit Fokus auf Familien mit Kindern.',
    '',
    `Reisegruppe: ${ctx.familyNames.join(', ') || 'Unbekannt'}.`,
  ];
  if (ctx.homebase) {
    parts.push(`Homebase: ${ctx.homebase.name}, ${ctx.homebase.address}.`);
  }
  if (ctx.dayLabel) {
    parts.push(`Tag: ${ctx.dayLabel}`);
  }

  parts.push('', `Geplante Stops an diesem Tag (in Reihenfolge):`);
  if (ctx.dayPois.length === 0) {
    parts.push('- (noch keine Stops — schlage generelle kindgerechte Ziele in der Nähe der Homebase vor)');
  } else {
    ctx.dayPois.forEach((poi, idx) => {
      const addr = poi.address ? ` — ${poi.address}` : '';
      parts.push(`${idx + 1}. ${poi.title} (${poi.category})${addr}`);
    });
  }

  const existingTitles = ctx.dayPois.map((p) => p.title).filter(Boolean);

  parts.push(
    '',
    `AUFGABE:`,
    `Schlage ${count} KINDGERECHTE Orte in Rom vor die sich als Zwischen- oder Zusatzstopp anbieten. Beispiele: Spielplätze, Gelaterien, Parks, Kinder-Museen, interaktive Kunst, Pasta-Kurse für Kinder, Aussichtspunkte die Kinder beeindrucken, Brunnen zum Planschen.`,
    '',
    `ANTWORT-FORMAT (strikt JSON, kein Markdown):`,
    `{`,
    `  "suggestions": [`,
    `    {`,
    `      "name": "Exakter Name des Ortes wie auf Google Maps",`,
    `      "category": "Kultur|Pizza|Gelato|Trattoria|Aperitivo|Instagram|Sonstiges",`,
    `      "kind": "Spielplatz|Gelateria|Park|Kinder-Museum|Interaktive-Kunst|Aussichtspunkt|Brunnen|Sonstiges",`,
    `      "reason": "1-2 Sätze auf Deutsch — WARUM kindgerecht + BEZUG zu einem der Stops oben (z.B. 'Nur 5 Gehminuten vom Pantheon', 'Perfekte Gelato-Pause nach dem Kolosseum')"`,
    `    }`,
    `  ]`,
    `}`,
    '',
    `REGELN:`,
    `- NUR echte existierende Orte in Rom`,
    `- KEINE Duplikate der Stops oben (${existingTitles.slice(0, 10).join(', ') || '—'})`,
    `- Geografisch nah zu mindestens EINEM der Tages-Stops oder auf dem Weg dazwischen`,
    `- Kindgerecht: sicher, nicht zu lange Wartezeiten, interaktiv oder Ausruh-Gelegenheit`,
    `- Begründung MUSS konkret einen Stop des Tages erwähnen (außer bei leerem Tag)`,
  );

  return parts.join('\n');
}

function normalizeCategory(cat: string | undefined): Category {
  if (!cat) return 'Sonstiges';
  const match = CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase().trim());
  return match ?? 'Sonstiges';
}

export async function generateKidFriendlySuggestions(
  ctx: AiKidSuggestionsContext,
): Promise<AiKidSuggestionsResult> {
  const model = getGeminiModel();
  const prompt = buildPrompt(ctx);

  const result = await model.generateContent(prompt);
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
    const parsed = JSON.parse(cleanJson) as {
      suggestions?: Array<{ name?: string; category?: string; kind?: string; reason?: string }>;
    };
    const existingLower = new Set(ctx.dayPois.map((p) => p.title.toLowerCase().trim()));
    const seen = new Set<string>();
    const suggestions: AiKidSuggestion[] = (parsed.suggestions ?? [])
      .map((s) => ({
        name: (s.name ?? '').trim(),
        category: normalizeCategory(s.category),
        kind: (s.kind ?? '').trim() || 'Sonstiges',
        reason: (s.reason ?? '').trim(),
      }))
      .filter((s) => {
        if (!s.name) return false;
        const key = s.name.toLowerCase();
        if (existingLower.has(key)) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return { suggestions, rawText };
  } catch (e) {
    console.error('[AI KidSuggestions] JSON parse failed:', e, '\nRaw:', rawText.slice(0, 300));
    return { suggestions: [], rawText };
  }
}
