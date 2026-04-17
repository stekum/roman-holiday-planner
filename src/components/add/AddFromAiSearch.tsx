import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Sparkles, Star } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import { aiNlSearch } from '../../lib/aiNlSearch';
import { fetchAiSummary } from '../../lib/placesNewApi';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';
import type { PlaceResult } from '../instagram/PlacesAutocomplete';

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
}

interface Props {
  families: Family[];
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

export function AddFromAiSearch({ families, onCancel, onSave }: Props) {
  const placesLib = useMapsLibrary('places');
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [translatedQuery, setTranslatedQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Sonstiges',
    note: '',
  });

  useEffect(() => {
    if (!placesLib) return;
    const div = document.createElement('div');
    placesServiceRef.current = new placesLib.PlacesService(div);
  }, [placesLib]);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || !placesServiceRef.current) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setCriteria([]);
    setTranslatedQuery('');
    setPlace(null);
    try {
      const ai = await aiNlSearch(trimmed);
      setCriteria(ai.criteria);
      setTranslatedQuery(ai.placesQuery);
      placesServiceRef.current.textSearch(
        { query: ai.placesQuery, bounds: ROME_BIAS },
        (places, status) => {
          setLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK ||
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
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
              }));
            setResults(mapped);
            if (mapped.length === 0) {
              setError(`Keine Treffer für „${ai.placesQuery}". Andere Formulierung probieren?`);
            }
          } else {
            setError(`Places API Fehler: ${status}`);
          }
        },
      );
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : String(e);
      setError(`AI-Suche fehlgeschlagen: ${msg}`);
    }
  };

  const handlePick = (result: SearchResult) => {
    if (!placesServiceRef.current) return;
    const aiSummaryPromise = fetchAiSummary(result.placeId);
    placesServiceRef.current.getDetails(
      { placeId: result.placeId, fields: ['url', 'opening_hours'] },
      (detail, status) => {
        const ok = status === google.maps.places.PlacesServiceStatus.OK;
        void aiSummaryPromise.then((aiSummary) => {
          setPlace({
            name: result.name,
            address: result.address,
            coords: result.coords,
            placeId: result.placeId,
            photoUrl: result.photoUrl,
            rating: result.rating,
            userRatingCount: result.userRatingCount,
            mapsUrl: ok ? detail?.url : undefined,
            openingHours: ok ? detail?.opening_hours?.weekday_text : undefined,
            aiSummary: aiSummary ?? undefined,
          });
        });
      },
    );
  };

  const handleSave = () => {
    if (!place) return;
    const id = `poi-${Date.now().toString(36)}`;
    onSave({
      id,
      title: place.name,
      category: fields.category,
      familyId: fields.familyId,
      description: fields.note.trim() || place.address || '',
      coords: place.coords,
      image: place.photoUrl ?? '',
      likes: 0,
      placeId: place.placeId,
      address: place.address,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      mapsUrl: place.mapsUrl,
      openingHours: place.openingHours,
      aiSummary: place.aiSummary,
      createdAt: Date.now(),
    });
  };

  if (place) {
    return (
      <div className="space-y-4">
        {place.photoUrl && (
          <div className="overflow-hidden rounded-2xl bg-cream-dark">
            <img src={place.photoUrl} alt="" className="h-40 w-full object-cover" />
          </div>
        )}
        <div className="space-y-1 rounded-2xl bg-olive/10 p-3 text-sm text-olive-dark">
          <div className="font-semibold">{place.name}</div>
          {place.address && <div className="text-xs">{place.address}</div>}
          {place.rating !== undefined && (
            <div className="flex items-center gap-1 text-xs text-ocker">
              <Star className="h-3 w-3 fill-current" />
              <span className="font-semibold">{place.rating.toFixed(1)}</span>
              {place.userRatingCount !== undefined && (
                <span className="text-ink/50">({place.userRatingCount} Bewertungen)</span>
              )}
            </div>
          )}
        </div>
        <AddPoiFields families={families} value={fields} onChange={setFields} />
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPlace(null)}
            className="flex-1 rounded-2xl bg-cream px-4 py-3 font-semibold text-ink/70 hover:bg-cream-dark"
          >
            Zurück zur Auswahl
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!fields.familyId}
            className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Beschreibe was du suchst
        </label>
        <div className="flex items-start gap-2 rounded-2xl border border-cream-dark bg-cream p-3 focus-within:border-terracotta focus-within:bg-white">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-terracotta" />
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            placeholder="z.B. Romantisches Restaurant mit Terrasse in Trastevere"
            className="flex-1 resize-none bg-transparent text-ink outline-none placeholder:text-ink/40"
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={loading || !query.trim() || !placesLib}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sucht…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Finden
            </>
          )}
        </button>
      </div>

      {criteria.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            AI hat verstanden
          </div>
          <div className="flex flex-wrap gap-1.5">
            {criteria.map((c) => (
              <span
                key={c}
                className="rounded-full bg-olive/15 px-2.5 py-0.5 text-xs font-semibold text-olive-dark"
              >
                {c}
              </span>
            ))}
          </div>
          {translatedQuery && (
            <div className="text-xs italic text-ink/50">
              Places-Suche: „{translatedQuery}"
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-3 text-xs text-terracotta">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="flex w-full items-start gap-3 rounded-2xl border border-cream-dark bg-white p-3 text-left transition hover:border-terracotta hover:bg-cream"
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
                  <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
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

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-cream px-4 py-3 font-semibold text-ink/70 hover:bg-cream-dark"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
