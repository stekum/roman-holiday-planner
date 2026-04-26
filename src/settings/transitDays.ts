/**
 * #78 Transit-Day-Resolver. Liefert für einen Tag (ISO YYYY-MM-DD) das
 * passende TransitDay-Objekt, falls vorhanden.
 *
 * Datums-Match ist exakt (ein Transit-Tag pro Datum). Wenn jemand mehrere
 * für denselben Tag anlegt (Edge-Case Manual-Editor), gewinnt der erste.
 */

import type { Settings, TransitDay } from './types';

export function getTransitDays(settings: Settings | undefined): TransitDay[] {
  if (!settings) return [];
  return Array.isArray(settings.transitDays) ? settings.transitDays : [];
}

export function getTransitDayForDate(
  settings: Settings | undefined,
  dateIso: string,
): TransitDay | undefined {
  return getTransitDays(settings).find((t) => t.date === dateIso);
}

export function isTransitDay(
  settings: Settings | undefined,
  dateIso: string,
): boolean {
  return getTransitDayForDate(settings, dateIso) !== undefined;
}
