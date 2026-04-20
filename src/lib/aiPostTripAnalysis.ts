import { getGeminiModel } from './gemini';
import type { POI } from '../data/pois';
import type { Family, TripConfig } from '../settings/types';
import { DEFAULT_TRIP_CONFIG } from '../settings/tripConfig';

interface PostTripContext {
  pois: POI[];
  families: Family[];
  tripConfig?: TripConfig;
  budgetTotal?: number;
  spentTotal?: number;
}

function buildPrompt(context: PostTripContext): string {
  const cfg = context.tripConfig ?? DEFAULT_TRIP_CONFIG;

  const visited = context.pois.filter((p) => p.visitStatus === 'visited');
  const skipped = context.pois.filter((p) => p.visitStatus === 'skipped');

  // Family-likes = votes === 'up'. Pro POI: welche Familien haben 'up' gevoted?
  const familyById = new Map(context.families.map((f) => [f.id, f.name]));
  const liked = context.pois
    .map((p) => {
      const upFamilies = Object.entries(p.votes ?? {})
        .filter(([, v]) => v === 'up')
        .map(([fid]) => familyById.get(fid))
        .filter(Boolean) as string[];
      return { poi: p, names: upFamilies.join(', ') };
    })
    .filter(({ names }) => names.length > 0);

  const formatPoi = (p: POI) => {
    const rating =
      p.rating !== undefined ? ` ${p.rating.toFixed(1)}★` : '';
    const comments = (p.comments ?? [])
      .map((c) => `    • ${c.text.slice(0, 120)}`)
      .join('\n');
    const commentBlock = comments ? `\n${comments}` : '';
    return `- ${p.title} (${p.category}${rating})${commentBlock}`;
  };

  const sections: string[] = [
    `Du bist ein Reise-Assistent. Analyse einer abgeschlossenen ${cfg.city}-Reise (${cfg.country}).`,
    `Antworte auf ${cfg.language}.`,
    '',
  ];

  if (visited.length > 0) {
    sections.push('BESUCHTE ORTE (was die Familie wirklich gesehen hat):');
    sections.push(visited.map(formatPoi).join('\n'));
    sections.push('');
  }

  if (skipped.length > 0) {
    sections.push('UEBERSPRUNGEN (bewusst weggelassen — Vorsicht beim Vorschlag Aehnlicher):');
    sections.push(skipped.map(formatPoi).join('\n'));
    sections.push('');
  }

  if (liked.length > 0) {
    sections.push('FAVORITEN (POIs die als besonders gut markiert wurden):');
    sections.push(
      liked.map(({ poi, names }) => `- ${poi.title} (${poi.category}) — geliked von ${names}`).join('\n'),
    );
    sections.push('');
  }

  if (context.budgetTotal !== undefined && context.spentTotal !== undefined) {
    sections.push(`BUDGET: ${context.spentTotal} von ${context.budgetTotal} ausgegeben.`);
    sections.push('');
  }

  sections.push('AUFGABE:');
  sections.push(
    `- Schlage 3-5 konkrete Dinge vor, die beim naechsten Besuch in ${cfg.city} gemacht werden sollten.`,
  );
  sections.push('- Basiere die Vorschlaege auf dem Geschmacksprofil aus BESUCHTEN + FAVORITEN.');
  sections.push('- Vermeide Aehnlichkeiten zu UEBERSPRUNGEN-Orten.');
  sections.push('- Jeder Vorschlag: 1-2 kurze Saetze mit konkretem Ort/Viertel/Erlebnis.');
  sections.push('- Nummeriert von 1.');
  sections.push('- Falls Budget-Daten vorhanden: beruecksichtige grob Preislage.');
  sections.push('');
  sections.push('ANTWORT:');
  sections.push('- Nur die 3-5 nummerierten Empfehlungen.');
  sections.push('- Kein Intro, kein Fazit, keine Markdown-Headings.');
  sections.push('- Kein Code-Block.');

  return sections.join('\n');
}

function extractText(
  response: {
    text: () => string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  },
): string {
  try {
    return response.text();
  } catch {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return parts
      .map((p) => p.text ?? '')
      .join('\n')
      .trim();
  }
}

function sanitize(raw: string): string {
  return raw
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/^"+|"+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generatePostTripAnalysis(
  context: PostTripContext,
): Promise<string> {
  const visitedCount = context.pois.filter((p) => p.visitStatus === 'visited').length;
  if (visitedCount === 0) {
    throw new Error(
      'Fuer eine Post-Trip-Analyse muessen mindestens einige POIs als besucht markiert sein.',
    );
  }

  const model = getGeminiModel();
  const result = await model.generateContent(buildPrompt(context));
  const raw = extractText(
    result.response as typeof result.response & {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    },
  );
  const text = sanitize(raw);
  if (!text) {
    throw new Error('Post-Trip-Analyse konnte nicht erzeugt werden. Bitte erneut versuchen.');
  }
  return text;
}
