import { useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Check, Loader2, MapPin, Sparkles, Star } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family, TripConfig } from '../../settings/types';
import { aiNlSearch, type AiNlFilters } from '../../lib/aiNlSearch';
import { fetchPlaceEnrichment, mapPriceLevel } from '../../lib/placesNewApi';
import { getPlacesBias } from '../../lib/placesBias';
import { isDevSkipMapsApi, logDevSkip } from '../../lib/devFlags';
import { isOpenOnDayAt, type PlacesPeriod } from '../../lib/openingHours';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';
import type { PlaceResult } from '../instagram/PlacesAutocomplete';

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  /** #300: nur befüllt wenn aktiver weekday-Filter den zweiten Pass triggert. */
  periods?: PlacesPeriod[];
}

interface Props {
  families: Family[];
  onCancel: () => void;
  /**
   * #300: Mehrfach-Add — wird pro Pick aufgerufen, schließt das Modal
   * NICHT. Der Parent muss `close` separat aus `onCancel` triggern.
   */
  onSaveAndStay: (poi: POI) => void;
  tripConfig?: TripConfig;
}

const DAY_NAMES_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function AddFromAiSearch({ families, onCancel, onSaveAndStay, tripConfig }: Props) {
  const placesLib = useMapsLibrary('places');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [filters, setFilters] = useState<AiNlFilters>({});
  const [translatedQuery, setTranslatedQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Sonstiges',
    note: '',
  });
  // #300: Race-Guard für runSearch + handlePick. Jeder neue Async-Flow
  // bumpt den Token; im .then darf nur reingeschrieben werden, wenn der
  // Token noch der aktuelle ist.
  const searchTokenRef = useRef(0);
  const pickTokenRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || !placesLib) return;
    const myToken = ++searchTokenRef.current;
    setLoading(true);
    setError(null);
    setResults([]);
    setCriteria([]);
    setFilters({});
    setTranslatedQuery('');
    setPlace(null);
    try {
      const ai = await aiNlSearch(trimmed, tripConfig);
      if (myToken !== searchTokenRef.current) return;
      setCriteria(ai.criteria);
      setFilters(ai.filters);
      setTranslatedQuery(ai.placesQuery);
      // #180: in dev skip real Places textSearch — show empty results with a hint.
      if (isDevSkipMapsApi()) {
        logDevSkip('AddFromAiSearch (Places searchByText)');
        setLoading(false);
        setError('Dev-Mode: Places-Search geskippt. localStorage.DEBUG_MAPS=\'1\' + reload um echt zu suchen.');
        return;
      }
      // #181: Places API (New) — searchByText mit expliziten fields.
      // #300: regularOpeningHours bewusst NICHT global mitfetchen (Cost-Tier
      // wechselt zu Pro). Bei aktivem Wochentag-Filter machen wir einen
      // gezielten zweiten Pass nur für die ≤8 Treffer.
      const bias = getPlacesBias(tripConfig);
      const { places } = await placesLib.Place.searchByText({
        textQuery: ai.placesQuery,
        ...(bias ? { locationBias: bias } : {}),
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'userRatingCount',
          'priceLevel',
          'photos',
        ],
        maxResultCount: 8,
      });
      if (myToken !== searchTokenRef.current) return;
      const mapped: SearchResult[] = (places ?? [])
        .flatMap((p) => {
          const loc = p.location;
          if (!loc) return [];
          return [{
            placeId: p.id ?? '',
            name: p.displayName ?? '',
            address: p.formattedAddress ?? '',
            coords: { lat: loc.lat(), lng: loc.lng() },
            photoUrl: p.photos?.[0]?.getURI({ maxWidth: 600, maxHeight: 400 }),
            rating: p.rating ?? undefined,
            userRatingCount: p.userRatingCount ?? undefined,
            priceLevel: mapPriceLevel(p.priceLevel),
          }];
        });

      // #300 Pfad B: Wochentag-Filter aktiv → opening-hours pro Treffer fetchen
      // und client-side filtern. Pfad A (kein weekday-Filter): direkt rendern.
      let finalResults = mapped;
      const wantedDay = ai.filters.weekday;
      const wantedTime = ai.filters.openAt;
      if (wantedDay !== undefined && mapped.length > 0) {
        setLoading(false);
        setFiltering(true);
        setResults(mapped);
        try {
          const enriched = await Promise.all(
            mapped.map(async (r) => {
              try {
                const p = new placesLib.Place({ id: r.placeId });
                await p.fetchFields({ fields: ['regularOpeningHours'] });
                const periods = p.regularOpeningHours?.periods as PlacesPeriod[] | undefined;
                return { ...r, periods };
              } catch {
                // fail-open: bei Fetch-Fehler Treffer behalten, kein periods
                return r;
              }
            }),
          );
          if (myToken !== searchTokenRef.current) return;
          finalResults = enriched.filter((r) => isOpenOnDayAt(r.periods, wantedDay, wantedTime));
        } finally {
          if (myToken === searchTokenRef.current) setFiltering(false);
        }
      } else {
        setLoading(false);
      }

      if (myToken !== searchTokenRef.current) return;
      setResults(finalResults);
      if (finalResults.length === 0) {
        const filterHint = wantedDay !== undefined
          ? ` (Filter: ${DAY_NAMES_SHORT_DE[wantedDay]}${wantedTime ? ` ab ${wantedTime}` : ''} geöffnet)`
          : '';
        setError(`Keine Treffer für „${ai.placesQuery}"${filterHint}. Andere Formulierung probieren?`);
      }
    } catch (e) {
      if (myToken !== searchTokenRef.current) return;
      setLoading(false);
      setFiltering(false);
      const msg = e instanceof Error ? e.message : String(e);
      setError(`AI-Suche fehlgeschlagen: ${msg}`);
    }
  };

  const handlePick = (result: SearchResult) => {
    if (!placesLib) return;
    const myToken = ++pickTokenRef.current;
    const enrichmentPromise = fetchPlaceEnrichment(result.placeId);
    // #181: Place.fetchFields für url + opening_hours
    const detailPlace = new placesLib.Place({ id: result.placeId });
    detailPlace
      .fetchFields({ fields: ['googleMapsURI', 'regularOpeningHours'] })
      .then(async () => {
        const enrichment = await enrichmentPromise;
        if (myToken !== pickTokenRef.current) return;
        setPlace({
          name: result.name,
          address: result.address,
          coords: result.coords,
          placeId: result.placeId,
          photoUrl: result.photoUrl,
          rating: result.rating,
          userRatingCount: result.userRatingCount,
          priceLevel: result.priceLevel,
          mapsUrl: detailPlace.googleMapsURI ?? undefined,
          openingHours: detailPlace.regularOpeningHours?.weekdayDescriptions,
          aiSummary: enrichment.aiSummary,
          priceRange: enrichment.priceRange,
          primaryType: enrichment.primaryType,
          primaryTypeDisplayName: enrichment.primaryTypeDisplayName,
        });
      })
      .catch(async () => {
        // Fetch-Fields-Fehler → trotzdem ohne url/opening_hours anzeigen
        const enrichment = await enrichmentPromise;
        if (myToken !== pickTokenRef.current) return;
        setPlace({
          name: result.name,
          address: result.address,
          coords: result.coords,
          placeId: result.placeId,
          photoUrl: result.photoUrl,
          rating: result.rating,
          userRatingCount: result.userRatingCount,
          priceLevel: result.priceLevel,
          aiSummary: enrichment.aiSummary,
          priceRange: enrichment.priceRange,
          primaryType: enrichment.primaryType,
          primaryTypeDisplayName: enrichment.primaryTypeDisplayName,
        });
      },
    );
  };

  /**
   * #300: nach Save NICHT schließen — addedPlaceIds bookmarken, zur Liste
   * zurück, Toast als Bestätigung. User kann weiter Treffer addieren oder
   * im Footer "Fertig" klicken.
   */
  const handleSave = () => {
    if (!place) return;
    const savedName = place.name;
    const savedPlaceId = place.placeId;
    const id = `poi-${Date.now().toString(36)}`;
    onSaveAndStay({
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
      priceLevel: place.priceLevel,
      priceRange: place.priceRange,
      primaryType: place.primaryType,
      primaryTypeDisplayName: place.primaryTypeDisplayName,
      mapsUrl: place.mapsUrl,
      openingHours: place.openingHours,
      aiSummary: place.aiSummary,
      createdAt: Date.now(),
    });
    setAddedPlaceIds((prev) => {
      const next = new Set(prev);
      next.add(savedPlaceId);
      return next;
    });
    setPlace(null);
    // Note-Field zurücksetzen, Family/Category bleibt für nächsten Pick
    setFields((prev) => ({ ...prev, note: '' }));
    showToast(`„${savedName}" hinzugefügt`);
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
            placeholder="z.B. Romantisches Restaurant mit Terrasse und Aussicht"
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

      {(criteria.length > 0 || filters.weekday !== undefined) && (
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
            {filters.weekday !== undefined && (
              <span className="rounded-full bg-terracotta/15 px-2.5 py-0.5 text-xs font-semibold text-terracotta-dark">
                Filter: {DAY_NAMES_SHORT_DE[filters.weekday]}
                {filters.openAt ? ` ab ${filters.openAt}` : ''} geöffnet
              </span>
            )}
          </div>
          {translatedQuery && (
            <div className="text-xs italic text-ink/50">
              Places-Suche: „{translatedQuery}"
            </div>
          )}
          {filtering && (
            <div className="flex items-center gap-1.5 text-xs italic text-ink/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              Öffnungszeiten werden geprüft…
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
          {results.map((r) => {
            const added = addedPlaceIds.has(r.placeId);
            return (
              <li key={r.placeId}>
                <button
                  type="button"
                  onClick={() => handlePick(r)}
                  className={`flex w-full items-start gap-3 rounded-2xl border bg-white p-3 text-left transition hover:border-terracotta hover:bg-cream ${
                    added ? 'border-olive/40 opacity-70' : 'border-cream-dark'
                  }`}
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
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                      {added && (
                        <span className="flex items-center gap-0.5 rounded-full bg-olive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-olive-dark">
                          <Check className="h-3 w-3" />
                          Hinzugefügt
                        </span>
                      )}
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
            );
          })}
        </ul>
      )}

      {toast && (
        <output
          aria-live="polite"
          className="block rounded-2xl bg-olive px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
        >
          {toast}
        </output>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-cream px-4 py-3 font-semibold text-ink/70 hover:bg-cream-dark"
        >
          {addedPlaceIds.size > 0 ? 'Fertig' : 'Abbrechen'}
        </button>
      </div>
    </div>
  );
}
