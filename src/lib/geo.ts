const R = 6371; // Earth radius in km

/**
 * Haversine distance between two points in **kilometers**.
 * Pure math, no API calls.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Formats distance nicely: „0.3 km" or „1.2 km". */
export function formatDistance(km: number): string {
  if (km < 0.1) return '< 100 m';
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km.toFixed(1)} km`;
}
