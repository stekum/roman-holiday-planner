/**
 * Resolver + Day-basierte Auswahl für Multi-Homebase (#74).
 *
 * Schema-Historie:
 *  - Vor #74: `settings.homebase?: Homebase` (singular, optional)
 *  - Seit #74: `settings.homebases?: Homebase[]` (plural, jede mit
 *    optionalem dateRange). Das alte Feld bleibt lesbar — der Resolver
 *    fällt auf ein Single-Entry-Array zurück wenn kein `homebases`
 *    gesetzt ist.
 */

import type { Homebase, Settings } from './types';

/**
 * Liefert die effektive Homebase-Liste für einen Workspace.
 *
 *  1. `settings.homebases` (falls gesetzt und nicht leer) wird direkt
 *     zurückgegeben — das ist die primäre Quelle seit #74.
 *  2. Fallback: `settings.homebase` (legacy-singular) als Single-Entry-
 *     Array — so laufen vor #74 geschriebene Firestore-Docs ohne
 *     Migration weiter.
 *  3. Sonst: leeres Array.
 */
export function getHomebases(settings: Settings | undefined): Homebase[] {
  if (!settings) return [];
  if (Array.isArray(settings.homebases) && settings.homebases.length > 0) {
    return settings.homebases;
  }
  if (settings.homebase) return [settings.homebase];
  return [];
}

/**
 * Findet die für einen bestimmten Tag (ISO-Date) gültige Homebase.
 *
 *  Priorität:
 *    1. Erste Homebase mit `dateRange`, deren Range `dayIso` enthält
 *       (from ≤ dayIso ≤ to).
 *    2. Erste Homebase **ohne** dateRange (catch-all).
 *    3. Erste Homebase überhaupt (Fallback für fehlerhafte Ranges).
 *    4. `undefined` wenn die Liste leer ist.
 *
 *  `dayIso` muss ein `YYYY-MM-DD`-String sein. Die Ranges werden als
 *  String-Compare geprüft — ISO-8601 ist lexikographisch sortierbar.
 */
export function getHomebaseForDay(
  homebases: readonly Homebase[],
  dayIso: string,
): Homebase | undefined {
  if (homebases.length === 0) return undefined;
  // 1. Range-Match
  for (const hb of homebases) {
    const r = hb.dateRange;
    if (!r) continue;
    if (r.from <= dayIso && dayIso <= r.to) return hb;
  }
  // 2. Catch-all ohne Range
  for (const hb of homebases) {
    if (!hb.dateRange) return hb;
  }
  // 3. Fallback: erste
  return homebases[0];
}

/**
 * Wählt die "aktuelle" Homebase für UI-Flows ohne expliziten Tages-
 * Kontext (Entdecken-Tab Karte, Distanz-Anzeige auf POI-Cards, Wetter).
 *
 *  - Während der Reise (heute im Trip-Range): Homebase des heutigen
 *    Tages.
 *  - Vor oder nach der Reise: Homebase des ersten Trip-Tages (tripStart).
 *  - Als letzte Rettung: erste Homebase der Liste.
 */
export function getCurrentHomebase(
  homebases: readonly Homebase[],
  todayIso: string,
  tripStart: string,
): Homebase | undefined {
  if (homebases.length === 0) return undefined;
  // In-trip: heute's Homebase
  const todayMatch = getHomebaseForDay(homebases, todayIso);
  if (todayMatch && todayIso >= tripStart) {
    // Extra-Check: wenn todayMatch durch Range getroffen hat, ist todayIso
    // sicher im Trip. Wenn es der Catch-all war, erst ab tripStart gültig
    // nehmen (sonst zeigt Pre-Trip-View früh den Tages-Fallback).
    return todayMatch;
  }
  // Pre/Post-Trip: Homebase von tripStart
  return getHomebaseForDay(homebases, tripStart) ?? homebases[0];
}
