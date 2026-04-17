/**
 * AI POI Suggestions — analysiert die bestehenden POIs einer Gruppe und
 * schlägt N NEUE Orte in Rom vor die zum Geschmacksprofil passen.
 *
 * Ein Gemini-Call. Response ist strict JSON mit { suggestions: [...] }.
 * Jeder Vorschlag hat nur den Namen — Places-Enrichment (coords, photo,
 * rating) passiert im Consumer (AiSuggestionsPanel).
 *
 * MVP (#15):
 * - Input: POIs + Homebase + Familiennamen
 * - Output: 5 Vorschläge mit name, category, reason (Deutsch)
 * - Bewusst NICHT im Scope: Vote-Signal, Distanz-Filter, Feedback-Loop
 */

import { getGeminiModel } from './gemini';
import type { Category, POI } from '../data/pois';
import { CATEGORIES } from '../data/pois';
import type { Homebase } from '../settings/types';

export interface AiSuggestion {
  name: string;
  category: Category;
  reason: string;
}

export interface AiSuggestionsResult {
  suggestions: AiSuggestion[];
  rawText: string;
}

export interface AiSuggestionsContext {
  pois: POI[];
  homebase?: Homebase;
  familyNames: string[];
  count?: number;
}

function buildPrompt(ctx: AiSuggestionsContext): string {
  const count = ctx.count ?? 5;
  const parts: string[] = [
    'Du bist ein Rom-Reise-Experte. Analysiere die POI-Liste einer Reisegruppe und schlage NEUE Orte vor, die zu deren Geschmacksprofil passen.',
    '',
    `Reisegruppe: ${ctx.familyNames.join(', ') || 'Unbekannt'}.`,
  ];

  if (ctx.homebase) {
    parts.push(
      `Homebase: ${ctx.homebase.name}, ${ctx.homebase.address}. ` +
        `Koordinaten: ${ctx.homebase.coords.lat.toFixed(4)}, ${ctx.homebase.coords.lng.toFixed(4)}.`,
    );
  }

  // Group POIs by category for a compact signal
  const byCategory: Record<string, string[]> = {};
  for (const poi of ctx.pois) {
    const cat = poi.category || 'Sonstiges';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(poi.title);
  }

  parts.push('', `Bestehende POIs (${ctx.pois.length}):`);
  const existingCats = Object.keys(byCategory);
  if (existingCats.length === 0) {
    parts.push('- (noch keine gespeicherten Orte — schlage eine gute Start-Mischung vor)');
  } else {
    for (const cat of existingCats) {
      parts.push(`- ${cat} (${byCategory[cat].length}): ${byCategory[cat].slice(0, 12).join(', ')}`);
    }
  }

  const existingNames = ctx.pois.map((p) => p.title).filter(Boolean);

  parts.push(
    '',
    `AUFGABE:`,
    `Schlage ${count} NEUE Orte in Rom vor die zu diesem Profil passen. Die Orte MÜSSEN echt existieren und NICHT bereits in der Liste oben sein.`,
    '',
    `ANTWORT-FORMAT (strikt JSON, kein Markdown):`,
    `{`,
    `  "suggestions": [`,
    `    {`,
    `      "name": "Exakter Name des Ortes wie auf Google Maps",`,
    `      "category": "Kultur|Pizza|Gelato|Trattoria|Aperitivo|Instagram|Sonstiges",`,
    `      "reason": "1-2 Sätze auf Deutsch — warum dieser Ort zum Geschmack der Gruppe passt"`,
    `    }`,
    `  ]`,
    `}`,
    '',
    `REGELN:`,
    `- Nur echte, existierende Orte in Rom (oder Umgebung, wenn es Sinn macht)`,
    `- KEINE Duplikate der bestehenden Liste (${existingNames.slice(0, 20).join(', ') || '—'})`,
    `- Diversifiziere: wenn die Gruppe viel Trattoria hat, kann 1 Trattoria dabei sein, aber auch andere Kategorien`,
    `- Geografisch sinnvoll zur Homebase wo möglich`,
    `- Name-Schreibweise wie auf Google Maps, damit Places-Suche sie findet`,
  );

  return parts.join('\n');
}

function normalizeCategory(cat: string | undefined): Category {
  if (!cat) return 'Sonstiges';
  const match = CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase().trim());
  return match ?? 'Sonstiges';
}

export async function generateAiSuggestions(
  ctx: AiSuggestionsContext,
): Promise<AiSuggestionsResult> {
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
      suggestions?: Array<{ name?: string; category?: string; reason?: string }>;
    };
    const existingLower = new Set(ctx.pois.map((p) => p.title.toLowerCase().trim()));
    const seen = new Set<string>();
    const suggestions: AiSuggestion[] = (parsed.suggestions ?? [])
      .map((s) => ({
        name: (s.name ?? '').trim(),
        category: normalizeCategory(s.category),
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
    console.error('[AI Suggestions] JSON parse failed:', e, '\nRaw:', rawText.slice(0, 300));
    return { suggestions: [], rawText };
  }
}
