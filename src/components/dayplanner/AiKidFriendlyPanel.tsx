import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Baby, ChevronDown, ChevronUp, Loader2, MapPin, Plus, Star } from 'lucide-react';
import type { Category, POI } from '../../data/pois';
import type { Family, Homebase, TripConfig } from '../../settings/types';
import { getCategoryEmoji } from '../../settings/tripConfig';
import {
  generateKidFriendlySuggestions,
  type AiKidSuggestion,
} from '../../lib/aiKidFriendlySuggestions';
import { fetchAiSummary } from '../../lib/placesNewApi';

const ROME_BIAS: google.maps.LatLngBoundsLiteral = {
  north: 41.99,
  south: 41.80,
  east: 12.60,
  west: 12.35,
};

interface EnrichedSuggestion extends AiKidSuggestion {
  placeId?: string;
  coords?: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  address?: string;
  mapsUrl?: string;
  openingHours?: string[];
  aiSummary?: string;
  unlocated?: boolean;
}

function buildPoiFromSuggestion(
  sug: EnrichedSuggestion & { coords: { lat: number; lng: number } },
  familyId: string,
): POI {
  const now = Date.now();
  return {
    id: `poi-${now.toString(36)}`,
    title: sug.name,
    category: sug.category,
    familyId,
    description: sug.reason || sug.address || '',
    coords: sug.coords,
    image: sug.photoUrl ?? '',
    likes: 0,
    placeId: sug.placeId,
    address: sug.address,
    rating: sug.rating,
    userRatingCount: sug.userRatingCount,
    priceLevel: sug.priceLevel,
    mapsUrl: sug.mapsUrl,
    openingHours: sug.openingHours,
    aiSummary: sug.aiSummary,
    createdAt: now,
  };
}

interface Props {
  dayPois: POI[];
  dayLabel: string;
  homebase?: Homebase;
  families: Family[];
  myFamilyId: string;
  onAddPoi: (poi: POI) => void;
  tripConfig?: TripConfig;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: EnrichedSuggestion[] }
  | { kind: 'error'; message: string };

export function AiKidFriendlyPanel({
  dayPois,
  dayLabel,
  homebase,
  families,
  myFamilyId,
  onAddPoi,
  tripConfig,
}: Props) {
  const placesLib = useMapsLibrary('places');
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!placesLib) return;
    serviceRef.current = new placesLib.PlacesService(document.createElement('div'));
  }, [placesLib]);

  const enrichOne = (sug: AiKidSuggestion): Promise<EnrichedSuggestion> => {
    return new Promise((resolve) => {
      const service = serviceRef.current;
      if (!service) {
        resolve({ ...sug, unlocated: true });
        return;
      }
      service.textSearch(
        { query: `${sug.name} Rome`, bounds: ROME_BIAS },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.[0]) {
            resolve({ ...sug, unlocated: true });
            return;
          }
          const r = results[0];
          const loc = r.geometry?.location;
          const enriched: EnrichedSuggestion = {
            ...sug,
            placeId: r.place_id ?? undefined,
            coords: loc ? { lat: loc.lat(), lng: loc.lng() } : undefined,
            photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 600, maxHeight: 400 }),
            rating: r.rating,
            userRatingCount: r.user_ratings_total,
            priceLevel: r.price_level,
            address: r.formatted_address ?? r.vicinity ?? undefined,
          };
          if (!enriched.coords) {
            resolve({ ...enriched, unlocated: true });
            return;
          }
          const summaryPromise = enriched.placeId
            ? fetchAiSummary(enriched.placeId)
            : Promise.resolve(null);
          if (!enriched.placeId) {
            void summaryPromise.then(() => resolve(enriched));
            return;
          }
          service.getDetails(
            { placeId: enriched.placeId, fields: ['url', 'opening_hours'] },
            (detail, dStatus) => {
              if (dStatus === google.maps.places.PlacesServiceStatus.OK && detail) {
                enriched.mapsUrl = detail.url;
                enriched.openingHours = detail.opening_hours?.weekday_text;
              }
              void summaryPromise.then((summary) => {
                enriched.aiSummary = summary ?? undefined;
                resolve(enriched);
              });
            },
          );
        },
      );
    });
  };

  const runSuggest = async () => {
    setExpanded(true);
    setState({ kind: 'loading' });
    try {
      const familyNames = families.map((f) => f.name);
      const result = await generateKidFriendlySuggestions({
        dayPois,
        homebase,
        familyNames,
        dayLabel,
        tripConfig,
      });
      if (result.suggestions.length === 0) {
        setState({ kind: 'error', message: 'Keine Vorschläge erhalten. Nochmal versuchen?' });
        return;
      }
      const enriched = await Promise.all(result.suggestions.map(enrichOne));
      const located = enriched.filter((s) => !s.unlocated);
      if (located.length === 0) {
        setState({
          kind: 'error',
          message: 'Vorschläge erhalten, aber keiner in Places gefunden. Nochmal versuchen?',
        });
        return;
      }
      setState({ kind: 'ready', items: located });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ kind: 'error', message: `KI-Vorschlag fehlgeschlagen: ${msg}` });
    }
  };

  const handleAdd = (sug: EnrichedSuggestion) => {
    if (!sug.coords || !myFamilyId) return;
    onAddPoi(buildPoiFromSuggestion({ ...sug, coords: sug.coords }, myFamilyId));
    if (state.kind === 'ready') {
      setState({
        kind: 'ready',
        items: state.items.filter((s) => s !== sug),
      });
    }
  };

  const headerButton = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-br from-ocker/15 to-olive/10 px-4 py-3 text-left transition hover:from-ocker/20 hover:to-olive/15"
    >
      <div className="flex items-center gap-2">
        <Baby className="h-4 w-4 text-ocker" />
        <div>
          <div className="text-sm font-semibold text-ink">Kindgerechte Vorschläge</div>
          <div className="text-xs text-ink/60">
            {dayPois.length > 0
              ? `Für diesen Tag mit ${dayPois.length} Stop${dayPois.length === 1 ? '' : 's'}`
              : 'Plane erst ein paar Stops'}
          </div>
        </div>
      </div>
      {expanded ? (
        <ChevronUp className="h-4 w-4 text-ink/50" />
      ) : (
        <ChevronDown className="h-4 w-4 text-ink/50" />
      )}
    </button>
  );

  if (!expanded) {
    return headerButton;
  }

  return (
    <div className="space-y-3">
      {headerButton}

      {state.kind === 'idle' && (
        <div className="rounded-2xl border border-dashed border-ocker/30 bg-ocker/5 p-4 text-center">
          <p className="mb-3 text-sm text-ink/70">
            Spielplätze, Gelaterien, Parks & Kinder-Museen in der Nähe eurer Stops.
          </p>
          <button
            type="button"
            onClick={runSuggest}
            disabled={!placesLib}
            className="inline-flex items-center gap-2 rounded-2xl bg-ocker px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocker disabled:opacity-50"
          >
            <Baby className="h-4 w-4" />
            Vorschläge finden
          </button>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-cream p-6 text-sm text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin text-ocker" />
          Suche kindgerechte Stops…
        </div>
      )}

      {state.kind === 'error' && (
        <div className="space-y-2 rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4">
          <p className="text-xs text-terracotta">{state.message}</p>
          <button
            type="button"
            onClick={runSuggest}
            className="rounded-xl bg-terracotta px-3 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark"
          >
            Nochmal versuchen
          </button>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="space-y-2">
          {state.items.length === 0 ? (
            <div className="rounded-2xl bg-cream p-4 text-center text-sm text-ink/60">
              Alle Vorschläge hinzugefügt ✓
              <button
                type="button"
                onClick={runSuggest}
                className="ml-2 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-semibold text-ocker hover:bg-cream-dark"
              >
                Neue laden
              </button>
            </div>
          ) : (
            <>
              {state.items.map((s) => (
                <SuggestionCard
                  key={`${s.name}-${s.placeId ?? ''}`}
                  suggestion={s}
                  onAdd={() => handleAdd(s)}
                  canAdd={Boolean(s.coords && myFamilyId)}
                />
              ))}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={runSuggest}
                  className="rounded-xl bg-cream px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-cream-dark"
                >
                  Neue Runde
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAdd,
  canAdd,
}: {
  suggestion: EnrichedSuggestion;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const { name, category, kind, reason, photoUrl, address, rating, userRatingCount } = suggestion;
  const emoji = getCategoryEmoji(category as Category);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cream-dark bg-white p-3">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">
          {emoji}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{name}</div>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-ink/50">
              <span className="rounded-full bg-ocker/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocker">
                {kind}
              </span>
              <span>{emoji} {category}</span>
              {rating !== undefined && (
                <>
                  <span>·</span>
                  <Star className="h-3 w-3 fill-current text-ocker" />
                  <span className="font-semibold text-ocker">{rating.toFixed(1)}</span>
                  {userRatingCount !== undefined && (
                    <span className="text-ink/40">({userRatingCount})</span>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            className="inline-flex items-center gap-1 rounded-xl bg-ocker px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-ocker disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Hinzufügen
          </button>
        </div>
        {reason && (
          <p className="mt-1 text-xs italic text-ink/60">{reason}</p>
        )}
        {address && (
          <div className="mt-1 flex items-center gap-1 text-xs text-ink/40">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
