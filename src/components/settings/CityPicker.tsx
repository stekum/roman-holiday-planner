import { useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  currencyCodeFromCountry,
  timezoneFromCountry,
} from '../../settings/tripConfig';

export interface CityPick {
  city: string;
  country: string;
  center: { lat: number; lng: number };
  /** IANA if we can derive one from the country, else undefined. */
  timezone?: string;
  /** ISO-4217 code derived from country (e.g. "EUR", "JPY"). */
  currency: string;
}

interface Props {
  onPick: (pick: CityPick) => void;
}

interface SearchHit {
  placeId: string;
  name: string;
  address: string;
}

/**
 * Global Places (New) autocomplete scoped to city-type results. Feeds
 * TripConfigEditor so the user can pick a destination and get center
 * coords, country, timezone heuristic, and currency in one step (#73).
 *
 * No locationBias — unlike PlacesAutocomplete in the Instagram flow we
 * want worldwide city matches here.
 */
export function CityPicker({ onPick }: Props) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!placesLib || trimmed.length < 2) {
      setHits([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: trimmed,
          // Bias toward administrative / locality types — Places API (New)
          // supports `includedType` for a primary filter.
          includedType: 'locality',
          fields: ['id', 'displayName', 'formattedAddress'],
          maxResultCount: 6,
        });
        if (cancelled) return;
        setLoading(false);
        setError(null);
        setHits(
          (places ?? [])
            .flatMap((p) =>
              p.id
                ? [
                    {
                      placeId: p.id,
                      name: p.displayName ?? trimmed,
                      address: p.formattedAddress ?? '',
                    },
                  ]
                : [],
            ),
        );
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setHits([]);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error('[CityPicker] searchByText failed:', err);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, placesLib]);

  async function handlePick(hit: SearchHit) {
    if (!placesLib) return;
    try {
      const detail = new placesLib.Place({ id: hit.placeId });
      await detail.fetchFields({
        fields: ['location', 'addressComponents', 'displayName'],
      });
      const loc = detail.location;
      if (!loc) {
        setError('Ort ohne Koordinaten — bitte anderes Ergebnis waehlen.');
        return;
      }
      const components = detail.addressComponents ?? [];
      const countryComponent = components.find((c) =>
        (c.types ?? []).includes('country'),
      );
      const country = countryComponent?.longText ?? '';
      const city = detail.displayName ?? hit.name;
      const pick: CityPick = {
        city,
        country,
        center: { lat: loc.lat(), lng: loc.lng() },
        timezone: timezoneFromCountry(country),
        currency: currencyCodeFromCountry(country),
      };
      onPick(pick);
      setQuery('');
      setHits([]);
    } catch (err) {
      console.error('[CityPicker] fetchFields failed:', err);
      setError('Konnte Details nicht laden — erneut versuchen.');
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 focus-within:border-terracotta focus-within:bg-white">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
        ) : (
          <Search className="h-4 w-4 text-ink/50" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Stadt suchen (Rom, Tokyo, Kyoto…)"
          aria-label="Stadt suchen"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink/40"
        />
      </div>

      {error && (
        <p className="mt-2 rounded-2xl bg-terracotta/10 p-2 text-xs text-terracotta">
          {error}
        </p>
      )}

      {hits.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-cream-dark bg-white shadow-lg">
          {hits.map((h) => (
            <li key={h.placeId}>
              <button
                type="button"
                onClick={() => handlePick(h)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-cream"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cream">
                  <MapPin className="h-5 w-5 text-terracotta" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {h.name}
                  </div>
                  <div className="truncate text-xs text-ink/50">{h.address}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
