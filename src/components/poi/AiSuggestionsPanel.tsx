import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ChevronDown, ChevronUp, Loader2, MapPin, Plus, Sparkles, Star } from 'lucide-react';
import type { Category, POI } from '../../data/pois';
import type { Family, Homebase, TripConfig } from '../../settings/types';
import { DEFAULT_TRIP_CONFIG, getCategoryEmoji } from '../../settings/tripConfig';
import { generateAiSuggestions, type AiSuggestion } from '../../lib/aiPoiSuggestions';
import { getPlacesBias } from '../../lib/placesBias';
import {
  fetchPlaceEnrichment,
  mapPriceLevel,
  type PriceRange,
} from '../../lib/placesNewApi';

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
    priceRange: sug.priceRange,
    primaryType: sug.primaryType,
    primaryTypeDisplayName: sug.primaryTypeDisplayName,
    mapsUrl: sug.mapsUrl,
    openingHours: sug.openingHours,
    aiSummary: sug.aiSummary,
    createdAt: now,
  };
}

interface EnrichedSuggestion extends AiSuggestion {
  placeId?: string;
  coords?: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  priceRange?: PriceRange;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  address?: string;
  mapsUrl?: string;
  openingHours?: string[];
  aiSummary?: string;
  /** Set when Places lookup failed — still render with manual note. */
  unlocated?: boolean;
}

interface Props {
  pois: POI[];
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

export function AiSuggestionsPanel({ pois, homebase, families, myFamilyId, onAddPoi, tripConfig }: Props) {
  const placesLib = useMapsLibrary('places');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [expanded, setExpanded] = useState(false);

  // #181: Places API (New) — Place.searchByText liefert alle benötigten
  // Felder in einem Call (früher: textSearch + getDetails).
  const city = tripConfig?.city ?? DEFAULT_TRIP_CONFIG.city;
  const bias = getPlacesBias(tripConfig, homebase);

  const enrichOne = async (sug: AiSuggestion): Promise<EnrichedSuggestion> => {
    if (!placesLib) return { ...sug, unlocated: true };
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: `${sug.name} ${city}`,
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
          'googleMapsURI',
          'regularOpeningHours',
        ],
        maxResultCount: 1,
      });
      const r = places?.[0];
      if (!r || !r.location) return { ...sug, unlocated: true };
      const enriched: EnrichedSuggestion = {
        ...sug,
        placeId: r.id,
        coords: { lat: r.location.lat(), lng: r.location.lng() },
        photoUrl: r.photos?.[0]?.getURI({ maxWidth: 600, maxHeight: 400 }),
        rating: r.rating ?? undefined,
        userRatingCount: r.userRatingCount ?? undefined,
        priceLevel: mapPriceLevel(r.priceLevel),
        address: r.formattedAddress ?? undefined,
        mapsUrl: r.googleMapsURI ?? undefined,
        openingHours: r.regularOpeningHours?.weekdayDescriptions,
      };
      // Parallel-Enrichment via REST-Endpoint (Cache gibts schon #178)
      if (r.id) {
        const e = await fetchPlaceEnrichment(r.id);
        enriched.aiSummary = e.aiSummary;
        enriched.priceRange = e.priceRange;
        enriched.primaryType = e.primaryType;
        enriched.primaryTypeDisplayName = e.primaryTypeDisplayName;
      }
      return enriched;
    } catch {
      return { ...sug, unlocated: true };
    }
  };

  const runSuggest = async () => {
    setExpanded(true);
    setState({ kind: 'loading' });
    try {
      const familyNames = families.map((f) => f.name);
      const result = await generateAiSuggestions({ pois, homebase, familyNames, tripConfig });
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
      setState({ kind: 'error', message: `AI-Vorschlag fehlgeschlagen: ${msg}` });
    }
  };

  const handleAdd = (sug: EnrichedSuggestion) => {
    if (!sug.coords || !myFamilyId) return;
    onAddPoi(buildPoiFromSuggestion({ ...sug, coords: sug.coords }, myFamilyId));
    // Remove the added one from the list so the user sees progress
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
      className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-br from-olive/15 to-terracotta/10 px-4 py-3 text-left transition hover:from-olive/20 hover:to-terracotta/15"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-terracotta" />
        <div>
          <div className="text-sm font-semibold text-ink">AI-Vorschläge</div>
          <div className="text-xs text-ink/60">
            {pois.length > 0
              ? `Basierend auf euren ${pois.length} Orten`
              : 'Starter-Mischung vorschlagen'}
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
    return <div className="mb-3">{headerButton}</div>;
  }

  return (
    <div className="mb-3 space-y-3">
      {headerButton}

      {state.kind === 'idle' && (
        <div className="rounded-2xl border border-dashed border-olive/30 bg-olive/5 p-4 text-center">
          <p className="mb-3 text-sm text-ink/70">
            Die KI analysiert eure Orte und schlägt passende neue vor.
          </p>
          <button
            type="button"
            onClick={runSuggest}
            disabled={!placesLib}
            className="inline-flex items-center gap-2 rounded-2xl bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Vorschläge generieren
          </button>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-cream p-6 text-sm text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
          Analysiere eure POIs…
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
                className="ml-2 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-semibold text-terracotta hover:bg-cream-dark"
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
  const { name, category, reason, photoUrl, address, rating, userRatingCount } = suggestion;
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
            <div className="flex items-center gap-1 text-xs text-ink/50">
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
            className="inline-flex items-center gap-1 rounded-xl bg-terracotta px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
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
