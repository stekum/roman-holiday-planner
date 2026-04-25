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
 * Extrahiert den Stadtnamen aus einer Homebase-Adresse — Heuristik für
 * Multi-City-Trips, damit AI-Prompts die Stadt der Tages-Homebase nennen
 * können (#240) statt der Trip-weiten `tripConfig.city`.
 *
 * Adress-Formate variieren:
 *  - Japan: "3-1-1 Umeda, Kita-ku, Osaka 530-0001, Japan"
 *  - Italien: "Via Garibaldi 12, 00153 Roma RM, Italy"
 *  - USA: "350 5th Ave, New York, NY 10118, United States"
 *
 * Ansatz: Komma-Split, vom Ende rückwärts. Letztes ist Country, das
 * wird übersprungen. Davor steht typisch "City PLZ" oder "City, State PLZ".
 * PLZ und Bundesland-Codes (2 Großbuchstaben + Ziffern) werden gestripped.
 *
 * Bei nicht-parseable Adressen → Fallback auf den übergebenen Default
 * (typischerweise `tripConfig.city`).
 */
export function extractCityFromAddress(
  address: string | undefined,
  fallback: string,
): string {
  if (!address) return fallback;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return fallback;
  // Vorletztes Segment hat meist die City. Letztes ist Country.
  for (let i = parts.length - 2; i >= Math.max(0, parts.length - 4); i--) {
    let seg = parts[i];
    // PLZ-Pattern entfernen (z.B. "530-0001", "10118", "00153")
    seg = seg.replace(/\b\d{3,}[-\s]?\d{0,4}\b/g, '').trim();
    // US-State-Codes (2 Großbuchstaben am Ende) entfernen
    seg = seg.replace(/\s+[A-Z]{2}$/, '').trim();
    // Italien-Provinzcodes (z.B. "Roma RM" → "Roma")
    seg = seg.replace(/\s+[A-Z]{2}\s*$/, '').trim();
    if (seg.length > 2 && /[a-zA-Z\u00C0-\u017F\u4E00-\u9FFF]/.test(seg)) {
      return seg;
    }
  }
  return fallback;
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
