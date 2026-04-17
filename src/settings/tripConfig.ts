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
