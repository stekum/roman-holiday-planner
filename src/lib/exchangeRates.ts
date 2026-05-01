/**
 * #255: Wechselkurs-Helfer fuer die Tagesbudget-Conversion.
 *
 * Quelle: https://open.er-api.com/v6/latest/{BASE} — kostenlos, kein Auth,
 * **CORS-fähig** (Access-Control-Allow-Origin: *). 1500 Requests/Monat.
 *
 * Hinweis: Frankfurter API (urspruenglich gewaehlt) hat KEINE CORS-Header
 * und funktioniert nicht direkt aus dem Browser — siehe Realtest #266.
 *
 * Cache: localStorage mit Tagesdatum-Key (Rates aendern sich taeglich).
 *
 * Bewusst MINIMAL: kein Firestore-Sync, kein Background-Fetch, kein
 * Retry-Backoff. Wird nur geladen wenn ein Trip in einer Fremdwaehrung
 * laeuft (TripConfig.currency != homeCurrency).
 *
 * TODO: Backend-Cache via Firebase Function 1×/Woche (siehe Folge-Issue),
 * dann ist API-Limit irrelevant und kein Vendor-Lock-in.
 */

const CACHE_KEY_PREFIX = 'rhp:exchangeRates';

export interface ExchangeRatesData {
  /** Base-Currency (z.B. 'EUR'). */
  base: string;
  /** Map ISO-4217-Code → Wechselkurs (1 base = N target). */
  rates: Record<string, number>;
  /** ISO-Date (YYYY-MM-DD) der ECB-Daten. */
  date: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheKey(base: string, date: string): string {
  return `${CACHE_KEY_PREFIX}:${base}:${date}`;
}

function readCache(base: string): ExchangeRatesData | null {
  try {
    const raw = localStorage.getItem(cacheKey(base, todayIso()));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRatesData;
    if (parsed?.base === base && parsed.rates) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(data: ExchangeRatesData): void {
  try {
    localStorage.setItem(cacheKey(data.base, todayIso()), JSON.stringify(data));
  } catch {
    // localStorage voll oder disabled — egal, beim nächsten Aufruf wird neu gefetcht
  }
}

/**
 * Holt aktuelle Wechselkurse von open.er-api.com. Cached pro Tag in
 * localStorage. Bei Netzwerk-Fehler: gibt evtl. Cache vom Vortag zurueck
 * (max-age 7 Tage als Fallback).
 */
export async function fetchRates(base: string): Promise<ExchangeRatesData> {
  const cached = readCache(base);
  if (cached) return cached;

  try {
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base.toUpperCase())}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ExchangeRate-API ${res.status}`);
    const json = (await res.json()) as {
      result?: string;
      base_code?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (json.result !== 'success' || !json.rates || !json.base_code) {
      throw new Error(`ExchangeRate-API invalid response: ${json.result ?? 'unknown'}`);
    }
    const data: ExchangeRatesData = {
      base: json.base_code,
      rates: json.rates,
      date: (json.time_last_update_utc ?? new Date().toISOString()).slice(0, 10),
    };
    writeCache(data);
    return data;
  } catch (err) {
    // Fallback: alte Cache-Eintraege bis zu 7 Tage rueckwaerts probieren
    for (let i = 1; i <= 7; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const past = d.toISOString().slice(0, 10);
      try {
        const raw = localStorage.getItem(cacheKey(base, past));
        if (raw) {
          const parsed = JSON.parse(raw) as ExchangeRatesData;
          if (parsed?.base === base && parsed.rates) return parsed;
        }
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

/**
 * Konvertiert einen Betrag von `from` nach `to` mittels der gegebenen
 * Rates (deren `base` muss `from` ODER `to` sein, sonst Cross-Rate
 * via Base-Currency). Liefert null wenn Conversion nicht moeglich.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  data: ExchangeRatesData,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const F = from.toUpperCase();
  const T = to.toUpperCase();
  const B = data.base.toUpperCase();

  // Direct: base ist `from`, target `to`
  if (B === F) {
    const rate = data.rates[T];
    return rate ? amount * rate : null;
  }
  // Inverse: base ist `to`, target `from`
  if (B === T) {
    const rate = data.rates[F];
    return rate ? amount / rate : null;
  }
  // Cross via base
  const rateFrom = data.rates[F];
  const rateTo = data.rates[T];
  if (!rateFrom || !rateTo) return null;
  return (amount / rateFrom) * rateTo;
}

/**
 * Komfort-Format fuer die UI: "≈ €15" oder "≈ 15.000 ¥".
 * Rundet auf 0 Nachkomma fuer JPY-aehnliche Waehrungen, sonst auf 2.
 */
export function formatConverted(amount: number, currencyCode: string, symbol: string): string {
  const noDecimals = ['JPY', 'KRW', 'HUF'].includes(currencyCode.toUpperCase());
  const fixed = noDecimals ? amount.toFixed(0) : amount.toFixed(2);
  return `≈ ${symbol}${fixed}`;
}
