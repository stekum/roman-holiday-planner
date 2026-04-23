/**
 * Einheitlicher Builder fuer Google Places API `locationBias`. Konsolidiert
 * die pre-#73 hardcoded ROME_BIAS-Faelle: jede Places-Suche muss die Nadel
 * zur aktiven Trip-Umgebung hinbiegen, nicht auf Rom.
 *
 * Prio-Reihenfolge:
 *   1. Homebase-Koordinaten (praeziseste Ortsangabe — Hotel/Airbnb)
 *   2. TripConfig-Center (Stadt-Mittelpunkt aus CityPicker)
 *   3. undefined → globale Places-Suche (ohne Bias)
 *
 * 30km Radius deckt Metropol-Regionen ab (Rom, Tokyo, Paris, …) und ist
 * konsistent mit AddFromInstagram.
 */

import type { Homebase, TripConfig } from '../settings/types';

export interface PlacesBias {
  center: { lat: number; lng: number };
  radius: number;
}

const DEFAULT_RADIUS_METERS = 30000;

type HomebaseLike = Homebase | { coords?: { lat: number; lng: number } } | { lat: number; lng: number } | undefined;

function extractCoords(hb: HomebaseLike): { lat: number; lng: number } | undefined {
  if (!hb) return undefined;
  if ('coords' in hb && hb.coords) return hb.coords;
  if ('lat' in hb && 'lng' in hb) return { lat: hb.lat, lng: hb.lng };
  return undefined;
}

export function getPlacesBias(
  tripConfig: TripConfig | undefined,
  homebase?: HomebaseLike,
): PlacesBias | undefined {
  const center = extractCoords(homebase) ?? tripConfig?.center;
  if (!center) return undefined;
  return { center, radius: DEFAULT_RADIUS_METERS };
}
