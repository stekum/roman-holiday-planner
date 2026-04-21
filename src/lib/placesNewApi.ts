/**
 * Places API (New) client — liefert AI-Review-Summary, priceRange + Cuisine-Tags.
 *
 * Ein Call pro POI — FieldMask holt alle Felder in einem Round-Trip.
 *
 * Requires: "Places API (New)" enabled in Google Cloud Console.
 * Graceful fallback: gibt leere/Null-Felder zurueck bei 4xx/Netzwerkfehler.
 */

export interface PriceRange {
  /** Untere Grenze in Haupt-Waehrungseinheiten (z.B. 30 fuer 30 EUR). */
  startAmount?: number;
  /** Obere Grenze. Fehlt bei „startet ab"-Ranges (z.B. €100+). */
  endAmount?: number;
  /** ISO 4217 currency code, z.B. "EUR", "JPY", "USD". */
  currencyCode?: string;
}

export interface PlaceEnrichment {
  aiSummary?: string;
  priceRange?: PriceRange;
  /** Raw Places type enum, z.B. "italian_restaurant" (fuer Filter/Logik). */
  primaryType?: string;
  /** Human-readable label, z.B. "Italian restaurant" (fuer Anzeige). */
  primaryTypeDisplayName?: string;
}

interface ApiPriceMoney {
  units?: string; // "30" (Ganzzahlbetrag als String)
  nanos?: number;
  currencyCode?: string;
}

interface ApiPlaceResponse {
  generativeSummary?: { overview?: { text?: string } };
  editorialSummary?: { text?: string };
  priceRange?: {
    startPrice?: ApiPriceMoney;
    endPrice?: ApiPriceMoney;
  };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
}

function parsePriceMoney(money: ApiPriceMoney | undefined): { amount?: number; currencyCode?: string } {
  if (!money) return {};
  const amount = money.units ? parseInt(money.units, 10) : undefined;
  return {
    amount: Number.isFinite(amount) ? amount : undefined,
    currencyCode: money.currencyCode,
  };
}

/**
 * #181: Legacy `price_level` war number 0-4, New API `priceLevel` ist ein
 * String-Enum. Gemeinsamer Mapper damit PoiCard-Fallback-Logik weiter
 * funktioniert.
 */
export function mapPriceLevel(
  p: google.maps.places.PriceLevel | null | undefined,
): number | undefined {
  if (!p) return undefined;
  const map: Record<string, number> = {
    FREE: 0,
    INEXPENSIVE: 1,
    MODERATE: 2,
    EXPENSIVE: 3,
    VERY_EXPENSIVE: 4,
  };
  return map[p as unknown as string];
}

// #178: Session-level cache — gleicher placeId wird nie doppelt gefetched,
// auch bei parallelen Calls (gemeinsames Promise).
const ENRICHMENT_CACHE = new Map<string, Promise<PlaceEnrichment>>();

/**
 * #179: Primt den Cache aus Firestore-gespeicherten Enrichment-Feldern.
 * Aufgerufen von useWorkspace wenn POIs aus Firestore geladen werden.
 * Spart die initiale Places-API-Roundtrip fuer bereits enriched Orte
 * auch ueber Session-Grenzen hinweg.
 *
 * Nur gepriment wenn wenigstens EIN substantielles Feld vorhanden ist —
 * sonst würden leere Cache-Entries spätere Fetches blockieren.
 */
export function primeEnrichmentCache(
  placeId: string | undefined,
  data: PlaceEnrichment,
): void {
  if (!placeId) return;
  if (!data.aiSummary && !data.priceRange && !data.primaryType) return;
  ENRICHMENT_CACHE.set(placeId, Promise.resolve(data));
}

export async function fetchPlaceEnrichment(placeId: string): Promise<PlaceEnrichment> {
  if (!placeId) return {};

  const cached = ENRICHMENT_CACHE.get(placeId);
  if (cached) return cached;

  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  )?.trim();
  if (!apiKey) return {};

  const promise = fetchPlaceEnrichmentUncached(placeId, apiKey);
  ENRICHMENT_CACHE.set(placeId, promise);
  return promise;
}

async function fetchPlaceEnrichmentUncached(
  placeId: string,
  apiKey: string,
): Promise<PlaceEnrichment> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'generativeSummary.overview.text',
            'editorialSummary.text',
            'priceRange',
            'primaryType',
            'primaryTypeDisplayName',
          ].join(','),
        },
      },
    );
    if (!res.ok) {
      // Einmalige Dev-Diagnose in der Browser-Console — haeufigste Ursache:
      // "Places API (New)" ist im Google Cloud Console nicht aktiviert (getrennt
      // von der klassischen "Places API"). Tipp: API-Key Restrictions pruefen.
      const body = await res.text().catch(() => '');
      console.warn(
        `[placesNewApi] ${res.status} for placeId ${placeId} — Places API (New) aktiviert?`,
        body.slice(0, 200),
      );
      return {};
    }

    const data = (await res.json()) as ApiPlaceResponse;

    const aiSummary =
      data.generativeSummary?.overview?.text ??
      data.editorialSummary?.text ??
      undefined;

    const start = parsePriceMoney(data.priceRange?.startPrice);
    const end = parsePriceMoney(data.priceRange?.endPrice);
    const priceRange: PriceRange | undefined =
      start.amount !== undefined || end.amount !== undefined
        ? {
            startAmount: start.amount,
            endAmount: end.amount,
            currencyCode: start.currencyCode ?? end.currencyCode,
          }
        : undefined;

    return {
      aiSummary,
      priceRange,
      primaryType: data.primaryType,
      primaryTypeDisplayName: data.primaryTypeDisplayName?.text,
    };
  } catch {
    return {};
  }
}

/**
 * Backward-compatible Wrapper: gibt nur die AI-Review-Summary zurueck.
 * Fuer bestehende Call-Sites die (noch) nicht auf fetchPlaceEnrichment umgestellt sind.
 */
export async function fetchAiSummary(placeId: string): Promise<string | null> {
  const enrichment = await fetchPlaceEnrichment(placeId);
  return enrichment.aiSummary ?? null;
}

/**
 * Formatter fuer die UI: "€30–€50", "€30+", "", etc.
 * Nimmt ein Fallback-Symbol (aus TripConfig) wenn currencyCode fehlt.
 */
export function formatPriceRange(
  range: PriceRange | undefined,
  fallbackSymbol = '€',
): string {
  if (!range) return '';
  const symbol = currencySymbolFromCode(range.currencyCode) || fallbackSymbol;
  if (range.startAmount !== undefined && range.endAmount !== undefined) {
    return `${symbol}${range.startAmount}–${symbol}${range.endAmount}`;
  }
  if (range.startAmount !== undefined) {
    return `${symbol}${range.startAmount}+`;
  }
  if (range.endAmount !== undefined) {
    return `${symbol}${range.endAmount}`;
  }
  return '';
}

/** ISO 4217 → UI-Symbol Mapping. Sparsam gehalten — Fallback auf Code. */
function currencySymbolFromCode(code: string | undefined): string {
  switch (code) {
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'CHF': return 'CHF';
    default: return code ?? '';
  }
}
