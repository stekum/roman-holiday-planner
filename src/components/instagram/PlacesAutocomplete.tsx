import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Search, Star } from 'lucide-react';
import { fetchPlaceEnrichment, type PriceRange } from '../../lib/placesNewApi';

export interface PlaceResult {
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  placeId: string;
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  mapsUrl?: string;
  openingHours?: string[];
  aiSummary?: string;
  /** Google Places price_level 0-4 (#34). */
  priceLevel?: number;
  /** Places API (New) priceRange (#167). */
  priceRange?: PriceRange;
  /** Places API (New) primaryType enum (#167). */
  primaryType?: string;
  /** Places API (New) primaryTypeDisplayName (#167). */
  primaryTypeDisplayName?: string;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
}

const ROME_BIAS: google.maps.LatLngBoundsLiteral = {
  north: 41.99,
  south: 41.80,
  east: 12.60,
  west: 12.35,
};

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  icon?: string;
}

export function PlacesAutocomplete({ onSelect }: Props) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    const div = document.createElement('div');
    placesServiceRef.current = new placesLib.PlacesService(div);
  }, [placesLib]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!placesServiceRef.current || trimmed.length < 3) {
      setResults([]);
      setErrorStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      placesServiceRef.current!.textSearch(
        {
          query: trimmed,
          bounds: ROME_BIAS,
        },
        (places, status) => {
          setLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
            status === google.maps.places.PlacesServiceStatus.OK
          ) {
            setErrorStatus(null);
            const mapped: SearchResult[] = (places ?? [])
              .slice(0, 8)
              .filter((p) => p.geometry?.location)
              .map((p) => ({
                placeId: p.place_id ?? '',
                name: p.name ?? '',
                address: p.formatted_address ?? p.vicinity ?? '',
                coords: {
                  lat: p.geometry!.location!.lat(),
                  lng: p.geometry!.location!.lng(),
                },
                photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 600, maxHeight: 400 }),
                rating: p.rating,
                userRatingCount: p.user_ratings_total,
                priceLevel: p.price_level,
                icon: p.icon,
              }));
            setResults(mapped);
          } else {
            setResults([]);
            setErrorStatus(String(status));
            console.error('[PlacesAutocomplete] textSearch failed:', status);
          }
        },
      );
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const handlePick = (result: SearchResult) => {
    if (!placesServiceRef.current) return;
    // Fetch `url` (Google Maps link) via details — textSearch doesn't include it.
    // Also fetch AI summary from Places API (New) in parallel.
    const enrichmentPromise = fetchPlaceEnrichment(result.placeId);
    placesServiceRef.current.getDetails(
      {
        placeId: result.placeId,
        fields: ['url', 'opening_hours'],
      },
      (place, status) => {
        const ok = status === google.maps.places.PlacesServiceStatus.OK;
        const mapsUrl = ok ? place?.url : undefined;
        const openingHours = ok ? place?.opening_hours?.weekday_text : undefined;
        void enrichmentPromise.then((enrichment) => {
          onSelect({
            name: result.name,
            address: result.address,
            coords: result.coords,
            placeId: result.placeId,
            photoUrl: result.photoUrl,
            rating: result.rating,
            userRatingCount: result.userRatingCount,
            priceLevel: result.priceLevel,
            mapsUrl,
            openingHours,
            aiSummary: enrichment.aiSummary,
            priceRange: enrichment.priceRange,
            primaryType: enrichment.primaryType,
            primaryTypeDisplayName: enrichment.primaryTypeDisplayName,
          });
          setQuery('');
          setResults([]);
        });
      },
    );
  };

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
          placeholder="Ort, Adresse, Airbnb, Restaurant…"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink/40"
        />
      </div>

      {errorStatus && (
        <div className="mt-2 rounded-2xl border border-terracotta/30 bg-terracotta/5 p-3 text-xs text-terracotta">
          <strong>Places API Fehler: {errorStatus}</strong>
          {errorStatus === 'REQUEST_DENIED' && (
            <p className="mt-1 text-ink/70">
              In der Google Cloud Console muss die klassische{' '}
              <strong>Places API</strong> aktiviert sein (nicht nur „Places API
              (New)"). Der API-Key muss außerdem für HTTP-Referrer{' '}
              <code className="rounded bg-cream px-1">http://localhost:5173/*</code>{' '}
              freigegeben sein.
            </p>
          )}
        </div>
      )}

      {results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-2xl border border-cream-dark bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-cream"
              >
                {r.photoUrl ? (
                  <img
                    src={r.photoUrl}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-cream">
                    <MapPin className="h-5 w-5 text-terracotta" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                  <div className="truncate text-xs text-ink/50">{r.address}</div>
                  {r.rating !== undefined && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-ocker">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="font-semibold">{r.rating.toFixed(1)}</span>
                      {r.userRatingCount !== undefined && (
                        <span className="text-ink/40">({r.userRatingCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
