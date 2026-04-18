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

export async function fetchPlaceEnrichment(placeId: string): Promise<PlaceEnrichment> {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  )?.trim();
  if (!apiKey || !placeId) return {};

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
