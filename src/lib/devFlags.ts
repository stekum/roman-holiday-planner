/**
 * #180: Dev-Mode-Flags gegen unerwartete Google-Maps-API-Kosten in Dev.
 *
 * Regel: In Dev werden expensive API-Calls (Directions, Places) standardmäßig
 * geskippt. Real testen via:
 *   localStorage.setItem('DEBUG_MAPS', '1'); location.reload();
 * Abschalten:
 *   localStorage.removeItem('DEBUG_MAPS'); location.reload();
 *
 * Prod-Build: Flag ist konstant false — Vite eliminiert die Check-Branches.
 */

const DEBUG_KEY = 'DEBUG_MAPS';

export function isDevSkipMapsApi(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DEBUG_KEY) !== '1';
}

export function logDevSkip(label: string): void {
  if (!import.meta.env.DEV) return;
  console.info(
    `[devFlags] skipped ${label} — set localStorage.DEBUG_MAPS='1' to enable real calls`,
  );
}
