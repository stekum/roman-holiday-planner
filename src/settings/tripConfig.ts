/**
 * TripConfig resolver + defaults. Single source of truth fuer
 * effective city/country/language/categories — alle AI-Libs und UI
 * gehen ueber diese Helper.
 */

import type { Settings, TripConfig } from './types';

export const DEFAULT_TRIP_CONFIG: TripConfig = {
  city: 'Rom',
  country: 'Italien',
  language: 'Deutsch',
  categories: ['Kultur', 'Pizza', 'Gelato', 'Trattoria', 'Aperitivo', 'Instagram', 'Sonstiges'],
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
