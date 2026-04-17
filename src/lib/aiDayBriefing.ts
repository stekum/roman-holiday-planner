import { getGeminiModel } from './gemini';
import type { POI } from '../data/pois';
import type { Homebase, TripConfig } from '../settings/types';
import { DEFAULT_TRIP_CONFIG } from '../settings/tripConfig';
import type { DayWeather } from './weather';

interface DayBriefingContext {
  dayIso: string;
  dayLabel: string;
  homebase?: Homebase;
  weather?: DayWeather;
  pois: POI[];
  tripConfig?: TripConfig;
}

function buildPrompt(context: DayBriefingContext): string {
  const weatherLine = context.weather
    ? `${context.weather.icon} ${context.weather.label}, ${context.weather.tempMin} bis ${context.weather.tempMax} °C`
    : 'Kein Wetter verfügbar';

  const homebaseLine = context.homebase
    ? `${context.homebase.name}, ${context.homebase.address}`
    : 'Keine Homebase hinterlegt';

  const stopLines = context.pois.map((poi, index) => {
    const parts = [
      `${index + 1}. ${poi.title} (${poi.category})`,
      poi.address ? `Adresse: ${poi.address}` : null,
      poi.rating !== undefined
        ? `Bewertung: ${poi.rating.toFixed(1)}${poi.userRatingCount ? ` (${poi.userRatingCount} Reviews)` : ''}`
        : null,
      poi.openingHours?.length
        ? `Öffnungszeiten-Hinweis: ${poi.openingHours.slice(0, 3).join(' | ')}`
        : 'Öffnungszeiten: keine Daten',
      poi.description ? `Notiz: ${poi.description}` : null,
    ];

    return parts.filter(Boolean).join('\n');
  });

  const cfg = context.tripConfig ?? DEFAULT_TRIP_CONFIG;
  return [
    `Du bist ein lokaler Reiseassistent fuer eine ${cfg.city}-Reise (${cfg.country}).`,
    `Antworte auf ${cfg.language}.`,
    `Erstelle ein kurzes Tages-Briefing fuer ${context.dayLabel} (${context.dayIso}).`,
    '',
    'KONTEXT:',
    `- Homebase: ${homebaseLine}`,
    `- Wetter: ${weatherLine}`,
    `- Anzahl Stops: ${context.pois.length}`,
    '',
    'STOPS IN REIHENFOLGE:',
    stopLines.join('\n\n'),
    '',
    'AUFGABE:',
    '- Schreibe einen kompakten deutschen Fliesstext mit 90 bis 140 Woertern.',
    '- Nutze genau 2 kurze Absaetze.',
    '- Fasse den Charakter des Tages zusammen.',
    '- Erwaehne das Wetter nur, wenn Daten vorhanden sind.',
    '- Weise auf kritische Timing- oder Oeffnungszeiten-Hinweise nur dann hin, wenn sie in den Eingabedaten stehen.',
    '- Gib 1 bis 2 konkrete praktische Tipps fuer die Gruppe.',
    '- Erfinde keine exakten Oeffnungszeiten, Reservierungspflichten oder Wege, wenn sie nicht in den Daten stehen.',
    '- Wenn Daten fehlen, formuliere vorsichtig statt zu halluzinieren.',
    '',
    'ANTWORT:',
    '- Nur der Briefing-Text.',
    '- Kein Markdown, keine Bullet-Points, keine JSON-Struktur.',
  ].join('\n');
}

function extractText(response: { text: () => string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }): string {
  try {
    return response.text();
  } catch {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return parts
      .map((part) => part.text ?? '')
      .join('\n')
      .trim();
  }
}

function sanitizeBriefing(rawText: string): string {
  return rawText
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/^"+|"+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateDayBriefing(
  context: DayBriefingContext,
): Promise<string> {
  if (context.pois.length === 0) {
    throw new Error('Für diesen Tag sind noch keine Stops geplant.');
  }

  const model = getGeminiModel();
  const result = await model.generateContent(buildPrompt(context));
  const rawText = extractText(result.response as typeof result.response & {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  });
  const briefing = sanitizeBriefing(rawText);

  if (!briefing) {
    throw new Error('AI-Briefing konnte nicht erzeugt werden. Bitte erneut versuchen.');
  }

  return briefing;
}
