/**
 * AI Day Planner — uses Gemini 2.5 Flash to generate a day itinerary
 * from a natural-language prompt.
 *
 * The response is parsed into structured stops that can be previewed
 * and then imported as POIs + day plan.
 */

import { getGeminiModel } from './gemini';
import type { Homebase } from '../settings/types';
import type { POI } from '../data/pois';

export interface AiStop {
  order: number;
  name: string;
  description: string;
  category: string;
  estimatedTime?: string; // e.g. "10:00–11:30"
  reason?: string; // why this stop was chosen
}

export interface AiDayPlanResult {
  stops: AiStop[];
  overview: string;
  rawText: string;
}

function buildSystemPrompt(context: {
  homebase?: Homebase;
  existingPoiNames: string[];
  familyNames: string[];
  dayLabel: string;
  childrenInfo?: string;
}): string {
  const parts: string[] = [
    `Du bist ein lokaler Reiseplaner für Rom, Italien.`,
    `Du erstellst einen Tagesplan für ${context.dayLabel}.`,
    `Die Reisegruppe besteht aus: ${context.familyNames.join(', ')}.`,
  ];

  if (context.childrenInfo) {
    parts.push(`Wichtig: ${context.childrenInfo}`);
  }

  if (context.homebase) {
    parts.push(
      `Die Unterkunft (Homebase) ist: ${context.homebase.name}, ${context.homebase.address}. ` +
      `Koordinaten: ${context.homebase.coords.lat.toFixed(4)}, ${context.homebase.coords.lng.toFixed(4)}. ` +
      `Der Tag startet und endet hier.`,
    );
  }

  if (context.existingPoiNames.length > 0) {
    parts.push(
      `Diese Orte hat die Gruppe bereits auf ihrer Liste (müssen nicht wiederholt werden, ` +
      `können aber als Kontext dienen): ${context.existingPoiNames.join(', ')}.`,
    );
  }

  parts.push(
    ``,
    `REGELN:`,
    `- Erstelle einen Plan mit 4-7 Stops.`,
    `- Berücksichtige realistische Gehzeiten zwischen den Stops.`,
    `- Plane Pausen ein (Kaffee, Gelato, Mittagessen) — nicht nur Sehenswürdigkeiten.`,
    `- Wenn Kinder dabei sind: kindgerechte Aktivitäten einbauen, nicht zu viel laufen.`,
    `- Gib für jeden Stop eine ungefähre Uhrzeit an.`,
    `- Nenne echte, existierende Orte in Rom mit korrektem Namen.`,
    ``,
    `ANTWORT-FORMAT (strikt JSON, kein Markdown):`,
    `{`,
    `  "overview": "Kurze Zusammenfassung des Tagesplans (1-2 Sätze)",`,
    `  "stops": [`,
    `    {`,
    `      "order": 1,`,
    `      "name": "Exakter Name des Ortes wie auf Google Maps",`,
    `      "description": "Was man dort macht / warum der Ort gut ist",`,
    `      "category": "Kultur|Pizza|Gelato|Trattoria|Aperitivo|Sonstiges",`,
    `      "estimatedTime": "10:00–11:30",`,
    `      "reason": "Warum dieser Stop zum Wunsch des Users passt"`,
    `    }`,
    `  ]`,
    `}`,
  );

  return parts.join('\n');
}

export async function generateDayPlan(
  userPrompt: string,
  context: {
    homebase?: Homebase;
    existingPoiNames: string[];
    familyNames: string[];
    dayLabel: string;
    childrenInfo?: string;
  },
): Promise<AiDayPlanResult> {
  const model = getGeminiModel();
  const systemPrompt = buildSystemPrompt(context);

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\nUser-Wunsch: ' + userPrompt }] },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const rawText = result.response.text();

  try {
    const parsed = JSON.parse(rawText) as {
      overview?: string;
      stops?: AiStop[];
    };

    return {
      stops: (parsed.stops ?? []).map((s, i) => ({
        order: s.order ?? i + 1,
        name: s.name ?? 'Unbekannt',
        description: s.description ?? '',
        category: s.category ?? 'Sonstiges',
        estimatedTime: s.estimatedTime,
        reason: s.reason,
      })),
      overview: parsed.overview ?? '',
      rawText,
    };
  } catch {
    // If JSON parsing fails, return the raw text as overview with no stops
    return {
      stops: [],
      overview: rawText.slice(0, 500),
      rawText,
    };
  }
}

/** Convert an AI stop into a POI-ready object (without coords — needs Places lookup). */
export function aiStopToPoi(
  stop: AiStop,
  familyId: string,
): Omit<POI, 'coords' | 'placeId' | 'image' | 'address' | 'rating' | 'userRatingCount' | 'mapsUrl'> {
  const category = (['Kultur', 'Pizza', 'Gelato', 'Trattoria', 'Aperitivo', 'Sonstiges'] as const)
    .find((c) => c.toLowerCase() === stop.category?.toLowerCase()) ?? 'Sonstiges';

  return {
    id: `ai-${Date.now().toString(36)}-${stop.order}`,
    title: stop.name,
    category,
    familyId,
    description: [stop.description, stop.reason ? `💡 ${stop.reason}` : '']
      .filter(Boolean)
      .join(' — '),
    likes: 0,
    needsLocation: true,
    createdAt: Date.now(),
  };
}
