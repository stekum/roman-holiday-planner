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

/**
 * Strukturierte Post-Filter aus der AI-Extraktion (#300). Werden client-side
 * gegen die Places-API-Daten angewandt — die Places API selbst hat keine
 * `openOnDay`-Parameter. Nur Wochentag/openAt sind heute aktiv (`AddFromAiSearch`),
 * `priceLevel` ist vorbereitet für Future Use.
 */
export interface AiNlFilters {
  /** 0=Sunday, …, 6=Saturday — matches both Date.getDay() und Places API
   *  regularOpeningHours.periods[].open.day. */
  weekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** "HH:mm" — der Place muss zu dieser Uhrzeit geöffnet sein. */
  openAt?: string;
  /** 1..4, korrespondiert zu Places `priceLevel` (PRICE_LEVEL_INEXPENSIVE..VERY_EXPENSIVE). */
  priceLevel?: 1 | 2 | 3 | 4;
}

export interface AiNlSearchResult {
  /** Optimierter Keyword-Query für Google Places textSearch. */
  placesQuery: string;
  /** Extrahierte Vibes/Kriterien für Chips neben den Ergebnissen. */
  criteria: string[];
  /** Strukturierte Post-Filter (#300). Werden gegen Place-Daten angewandt. */
  filters: AiNlFilters;
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
5. Wenn der Nutzer Wochentag, Tageszeit oder Preisstufe nennt → strukturiert in "filters" extrahieren.

ANTWORT-FORMAT (strikt JSON, kein Markdown, keine Erklärung):
{
  "placesQuery": "romantic rooftop restaurant Trastevere ${cityEn}",
  "criteria": ["Romantisch", "Dachterrasse", "Trastevere"],
  "filters": { "weekday": 1, "openAt": "19:00", "priceLevel": 3 }
}

Regeln:
- placesQuery MUSS das Wort "${cityEn}" enthalten (sonst findet Places Ergebnisse weltweit).
- placesQuery ist 4-8 Wörter, Englisch, für Google Places Text Search optimiert.
- criteria sind 2-5 kurze Stichworte auf ${cfg.language} für UI-Chips.
- Wenn der Nutzer einen spezifischen bekannten Ort nennt, nimm den Namen direkt.
- Halluziniere KEINE Ortsnamen — die echte Suche macht Google Places.

FILTERS — strikt:
- weekday: nur wenn der Nutzer EXPLIZIT einen Wochentag nennt ("Montag", "monday", "Mo", "sonntags", "weekend"=ohne weekday lassen).
  Mapping: Sonntag=0, Montag=1, Dienstag=2, Mittwoch=3, Donnerstag=4, Freitag=5, Samstag=6.
- openAt: "HH:mm" (24h), nur bei expliziter Tages­zeit-Nennung. Heuristik: "morgens"="09:00", "mittags"="13:00", "nachmittags"="15:00", "abends"="19:00", "spät"="22:00", "nachts"="00:00". "Brunch" alleine NICHT setzen außer mit Wochentag.
- priceLevel: 1=günstig/cheap, 2=normal, 3=gehoben/fancy/upscale, 4=luxus/very expensive. Nur bei klarer Preisklassen-Nennung.
- Felder die nicht zutreffen WEGLASSEN. NIEMALS raten. Im Zweifel: Feld weglassen, lieber Filter zu lasch als Filter zu eng.
- Wenn keine Filter zutreffen → "filters": {} oder Feld weglassen.`;
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
      filters: sanitizeFilters(parsed.filters),
      rawText,
    };
  } catch (e) {
    console.error('[AI NL Search] JSON parse failed:', e, '\nRaw:', rawText.slice(0, 300));
    return {
      placesQuery: `${userQuery.trim()} ${cityEn}`,
      criteria: [],
      filters: {},
      rawText,
    };
  }
}

/**
 * Defensiv das filters-Feld validieren — Gemini kann String-Wochentage liefern,
 * out-of-range-Werte halluzinieren oder das Feld komplett weglassen. Wir lassen
 * im Zweifel lieber einen Filter raus als einen falschen anzuwenden.
 */
function sanitizeFilters(raw: unknown): AiNlFilters {
  if (!raw || typeof raw !== 'object') return {};
  const f = raw as Record<string, unknown>;
  const out: AiNlFilters = {};
  if (typeof f.weekday === 'number' && Number.isInteger(f.weekday) && f.weekday >= 0 && f.weekday <= 6) {
    out.weekday = f.weekday as AiNlFilters['weekday'];
  }
  if (typeof f.openAt === 'string' && /^\d{2}:\d{2}$/.test(f.openAt)) {
    out.openAt = f.openAt;
  }
  if (typeof f.priceLevel === 'number' && Number.isInteger(f.priceLevel) && f.priceLevel >= 1 && f.priceLevel <= 4) {
    out.priceLevel = f.priceLevel as AiNlFilters['priceLevel'];
  }
  return out;
}
