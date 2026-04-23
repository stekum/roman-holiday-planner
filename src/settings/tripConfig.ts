/**
 * TripConfig resolver + defaults. Single source of truth fuer
 * effective city/country/language/categories — alle AI-Libs und UI
 * gehen ueber diese Helper.
 */

import type { Settings, TripConfig } from './types';

/** Rome city center — also the absolute map fallback. */
export const DEFAULT_CENTER = { lat: 41.8925, lng: 12.4853 };
export const DEFAULT_ZOOM = 14;

export const DEFAULT_TRIP_CONFIG: TripConfig = {
  city: 'Rom',
  country: 'Italien',
  language: 'Deutsch',
  categories: ['Kultur', 'Pizza', 'Gelato', 'Trattoria', 'Aperitivo', 'Instagram', 'Sonstiges'],
  center: DEFAULT_CENTER,
  defaultZoom: DEFAULT_ZOOM,
  timezone: 'Europe/Rome',
  currency: 'EUR',
};

/** Emojis fuer die bekannten Rom-Default-Kategorien. Custom-Kategorien
 *  fallen auf 📍 zurueck. */
export const DEFAULT_CATEGORY_EMOJI: Record<string, string> = {
  Kultur: '🏛️',
  Pizza: '🍕',
  Gelato: '🍨',
  Trattoria: '🍝',
  Aperitivo: '🍹',
  Instagram: '📸',
  Sonstiges: '📍',
  // Common extensions that might appear in other trips
  Restaurant: '🍽️',
  Café: '☕',
  Cafe: '☕',
  Natur: '🌳',
  Park: '🌳',
  Ramen: '🍜',
  Sushi: '🍣',
  Tempel: '⛩️',
  Museum: '🖼️',
  Einkaufen: '🛍️',
  Shopping: '🛍️',
};

export function getTripConfig(settings: Settings | undefined): TripConfig {
  const cfg = settings?.tripConfig;
  if (!cfg) return DEFAULT_TRIP_CONFIG;
  // Defensive: falls Firestore ein partial-object zurueckgibt
  return {
    city: cfg.city || DEFAULT_TRIP_CONFIG.city,
    country: cfg.country || DEFAULT_TRIP_CONFIG.country,
    language: cfg.language || DEFAULT_TRIP_CONFIG.language,
    categories:
      Array.isArray(cfg.categories) && cfg.categories.length > 0
        ? cfg.categories
        : DEFAULT_TRIP_CONFIG.categories,
    center: cfg.center ?? DEFAULT_TRIP_CONFIG.center,
    defaultZoom: cfg.defaultZoom ?? DEFAULT_TRIP_CONFIG.defaultZoom,
    timezone: cfg.timezone ?? DEFAULT_TRIP_CONFIG.timezone,
    currency: cfg.currency ?? DEFAULT_TRIP_CONFIG.currency,
  };
}

export function getCategoryEmoji(category: string): string {
  return DEFAULT_CATEGORY_EMOJI[category] ?? '📍';
}

/**
 * Leitet das Waehrungssymbol aus dem TripConfig-Land ab.
 * Nicht perfekt (Griechenland → € ist korrekt, Tuerkei → TRY haben wir noch nicht),
 * aber deckt die haeufigsten Europa-/Asien-Reise-Targets ab.
 */
export function currencyFromCountry(country: string): string {
  const c = country.toLowerCase().trim();
  if (['japan', 'japon', 'japanisch'].includes(c)) return '¥';
  if (['usa', 'us', 'vereinigte staaten', 'united states'].includes(c)) return '$';
  if (['uk', 'vereinigtes königreich', 'united kingdom', 'england'].includes(c)) return '£';
  if (['schweiz', 'switzerland'].includes(c)) return 'CHF';
  return '€';
}

/**
 * Heuristik fuer ISO-4217 Currency-Code pro Land. Gleiche Abdeckung wie
 * {@link currencyFromCountry} — eine Ebene tiefer, damit wir im
 * TripConfig den Code speichern und bei Bedarf ein Symbol daraus
 * ableiten. Unbekannt → "EUR".
 */
export function currencyCodeFromCountry(country: string): string {
  const c = country.toLowerCase().trim();
  if (['japan', 'japon', 'japanisch'].includes(c)) return 'JPY';
  if (['usa', 'us', 'vereinigte staaten', 'united states'].includes(c)) return 'USD';
  if (['uk', 'vereinigtes königreich', 'united kingdom', 'england'].includes(c)) return 'GBP';
  if (['schweiz', 'switzerland'].includes(c)) return 'CHF';
  return 'EUR';
}

/** ISO-4217 → lesbares Symbol. Fallback: der Code selbst. */
export function currencySymbolFromCode(code: string | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'EUR':
      return '€';
    case 'JPY':
      return '¥';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    case 'CHF':
      return 'CHF';
    default:
      return code || '€';
  }
}

/**
 * Heuristik fuer IANA-Timezone pro Land. Deckt die haeufigsten
 * Reise-Laender ab; unbekannt → undefined (Feld bleibt im TripConfig leer,
 * AI-Prompts koennen dann weiter ohne timezone auskommen).
 */
export function timezoneFromCountry(country: string): string | undefined {
  const c = country.toLowerCase().trim();
  if (['italien', 'italia', 'italy'].includes(c)) return 'Europe/Rome';
  if (['deutschland', 'germany'].includes(c)) return 'Europe/Berlin';
  if (['frankreich', 'france'].includes(c)) return 'Europe/Paris';
  if (['spanien', 'spain', 'españa'].includes(c)) return 'Europe/Madrid';
  if (['portugal'].includes(c)) return 'Europe/Lisbon';
  if (['griechenland', 'greece'].includes(c)) return 'Europe/Athens';
  if (['österreich', 'oesterreich', 'austria'].includes(c)) return 'Europe/Vienna';
  if (['schweiz', 'switzerland'].includes(c)) return 'Europe/Zurich';
  if (['niederlande', 'netherlands', 'holland'].includes(c)) return 'Europe/Amsterdam';
  if (['uk', 'vereinigtes königreich', 'united kingdom', 'england'].includes(c)) return 'Europe/London';
  if (['japan', 'japon', 'japanisch'].includes(c)) return 'Asia/Tokyo';
  if (['usa', 'us', 'vereinigte staaten', 'united states'].includes(c)) return 'America/New_York';
  if (['kanada', 'canada'].includes(c)) return 'America/Toronto';
  if (['thailand'].includes(c)) return 'Asia/Bangkok';
  return undefined;
}
