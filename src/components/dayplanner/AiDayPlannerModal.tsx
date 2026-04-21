import { useState } from 'react';
import { Check, Loader2, Search, Sparkles, X } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  generateDayPlan,
  type AiDayPlanResult,
} from '../../lib/aiDayPlanner';
import { isGeminiConfigured } from '../../lib/gemini';
import { track } from '../../lib/analytics';
import type { POI, Category } from '../../data/pois';
import type { Settings } from '../../settings/types';
import { getTripConfig } from '../../settings/tripConfig';

interface Props {
  open: boolean;
  onClose: () => void;
  dayLabel: string;
  dayIso: string;
  settings: Settings;
  existingPoiNames: string[];
  onAccept: (pois: POI[], order: string[], overview: string) => void;
}

const QUICK_TAGS = [
  { label: '🏛️ Kultur', value: 'Sehenswürdigkeiten und Kultur' },
  { label: '🍕 Pizza', value: 'gute Pizza' },
  { label: '🍨 Gelato', value: 'Gelato-Pause' },
  { label: '🍝 Trattoria', value: 'authentische Trattoria zum Mittagessen' },
  { label: '🍹 Aperitivo', value: 'Aperitivo am Abend' },
  { label: '👨‍👩‍👧‍👦 Kinderfreundlich', value: 'kinderfreundliche Aktivitäten' },
  { label: '🌅 Aussicht', value: 'schöne Aussichtspunkte' },
  { label: '🚶 Wenig laufen', value: 'kompakte Route, nicht zu viel Laufen' },
];

const CATEGORY_MAP: Record<string, Category> = {
  kultur: 'Kultur',
  pizza: 'Pizza',
  gelato: 'Gelato',
  trattoria: 'Trattoria',
  aperitivo: 'Aperitivo',
  sonstiges: 'Sonstiges',
};

export function AiDayPlannerModal({
  open,
  onClose,
  dayLabel,
  settings,
  existingPoiNames,
  onAccept,
}: Props) {
  const placesLib = useMapsLibrary('places');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiDayPlanResult | null>(null);
  const [excludedStops, setExcludedStops] = useState<Set<number>>(new Set());
  const [resolving, setResolving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedFamilyId, setSelectedFamilyId] = useState(settings.families[0]?.id ?? '');

  if (!open) return null;

  const toggleTag = (value: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const fullPrompt = [
    prompt.trim(),
    ...Array.from(selectedTags),
  ].filter(Boolean).join('. ');

  const handleGenerate = async () => {
    if (!fullPrompt) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const plan = await generateDayPlan(fullPrompt, {
        homebase: settings.homebase,
        existingPoiNames,
        familyNames: settings.families.map((f) => f.name),
        dayLabel,
        childrenInfo: 'Es sind Kinder dabei. Plane kindgerechte Pausen und Aktivitäten ein.',
        tripConfig: getTripConfig(settings),
      });
      setResult(plan);
      track('ai_plan_generated', { scope: 'day' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI-Generierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!result || result.stops.length === 0 || !placesLib) return;
    setResolving(true);
    setError(null);

    try {
      const pois: POI[] = [];

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const activeStops = result.stops.filter((_, i) => !excludedStops.has(i));
      console.log(`[AI Planner] Resolving ${activeStops.length} stops via Places...`);

      // Derive city context from homebase address
      const cityHint = settings.homebase?.address
        ? settings.homebase.address.split(',').slice(-2).join(',').trim()
        : '';

      for (const stop of activeStops) {
        // Sequential with delay to avoid rate-limiting
        if (pois.length > 0) await delay(400);

        // Try multiple search queries in order of specificity
        const queries = [
          cityHint ? `${stop.name}, ${cityHint}` : `${stop.name}`,
          stop.name,
        ];
        const uniqueQueries = [...new Set(queries)];

        // #181: Places API (New) — Place.searchByText liefert alle relevanten
        // Felder in einem Call (früher: textSearch + getDetails für photo).
        let match: google.maps.places.Place | null = null;

        for (const query of uniqueQueries) {
          try {
            const { places } = await placesLib.Place.searchByText({
              textQuery: query,
              fields: [
                'id',
                'displayName',
                'formattedAddress',
                'location',
                'rating',
                'userRatingCount',
                'photos',
                'googleMapsURI',
              ],
              maxResultCount: 1,
              ...(settings.homebase?.coords
                ? {
                    locationBias: {
                      center: settings.homebase.coords,
                      radius: 30000, // 30km around homebase
                    },
                  }
                : {}),
            });
            console.log(`[AI Planner] searchByText "${query}" → ${places?.length ?? 0} results`);
            if (places && places.length > 0 && places[0].location) {
              match = places[0];
              break;
            }
          } catch (err) {
            console.warn(`[AI Planner] searchByText "${query}" failed`, err);
          }
          await delay(150);
        }

        let photoUrl = '';
        if (match?.photos?.[0]) {
          try {
            photoUrl = match.photos[0].getURI({ maxWidth: 800, maxHeight: 600 }) ?? '';
          } catch {
            /* ignore */
          }
        }

        console.log(`[AI Planner] Stop "${stop.name}" → match: ${match?.displayName ?? 'NONE'}, coords: ${match?.location ? 'YES' : 'NO'}, photo: ${photoUrl ? 'YES' : 'NO'}`);

        // Skip stops that resolve to the homebase (avoid duplicate POI entries)
        if (match?.id && settings.homebase?.placeId && match.id === settings.homebase.placeId) {
          console.log(`[AI Planner] Skipping "${stop.name}" — matches homebase placeId`);
          continue;
        }
        const normalizedMatch = (match?.displayName ?? stop.name).toLowerCase().trim();
        const normalizedHomebase = settings.homebase?.name?.toLowerCase().trim() ?? '';
        if (normalizedHomebase && normalizedMatch === normalizedHomebase) {
          console.log(`[AI Planner] Skipping "${stop.name}" — matches homebase name`);
          continue;
        }

        const category =
          CATEGORY_MAP[stop.category?.toLowerCase() ?? ''] ?? 'Sonstiges';

        const poi: POI = {
          id: `ai-${Date.now().toString(36)}-${stop.order}`,
          title: match?.displayName ?? stop.name,
          category,
          familyId: selectedFamilyId || settings.families[0]?.id || 'default-a',
          description: [
            stop.description,
            stop.estimatedTime ? `⏰ ${stop.estimatedTime}` : '',
            stop.reason ? `💡 ${stop.reason}` : '',
          ].filter(Boolean).join(' — '),
          coords: match?.location
            ? { lat: match.location.lat(), lng: match.location.lng() }
            : undefined,
          image: photoUrl,
          likes: 0,
          address: match?.formattedAddress ?? undefined,
          rating: match?.rating ?? undefined,
          userRatingCount: match?.userRatingCount ?? undefined,
          placeId: match?.id,
          mapsUrl: match?.googleMapsURI ?? undefined,
          needsLocation: !match?.location,
          createdAt: Date.now() + stop.order,
        };

        pois.push(poi);
      }

      const order = pois.map((p) => p.id);
      track('ai_plan_accepted', { scope: 'day' });
      onAccept(pois, order, result.overview);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Verorten der Stops.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-olive/15 p-2 text-olive">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                className="text-xl text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                AI Tagesplan
              </h2>
              <p className="text-xs text-ink/60">{dayLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink/50 hover:bg-cream hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isGeminiConfigured && (
          <div className="mb-4 rounded-2xl bg-terracotta/10 p-3 text-sm text-terracotta">
            Gemini API Key fehlt. Setze <code>VITE_GEMINI_API_KEY</code> in{' '}
            <code>.env.local</code>.
          </div>
        )}

        {!result ? (
          <div className="space-y-4">
            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Beschreib deinen idealen Tag in Rom... z.B. 'Morgens Vatikan, mittags Pizza in Trastevere, nachmittags schlendern, abends Aperitivo mit Aussicht'"
                className="w-full resize-none rounded-2xl border border-cream-dark bg-cream px-4 py-3 text-ink outline-none focus:border-olive focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTags.has(tag.value)
                      ? 'bg-olive text-white shadow-md'
                      : 'bg-cream text-ink/70 hover:bg-cream-dark'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            {settings.families.length > 1 && (
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Zuordnung
                </span>
                <div className="flex flex-wrap gap-2">
                  {settings.families.map((fam) => (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => setSelectedFamilyId(fam.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFamilyId === fam.id
                          ? 'text-white shadow-md'
                          : 'bg-cream text-ink/60 hover:bg-cream-dark'
                      }`}
                      style={selectedFamilyId === fam.id ? { backgroundColor: fam.color } : undefined}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: selectedFamilyId === fam.id ? '#fff' : fam.color }}
                      />
                      {fam.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-terracotta/10 p-3 text-sm text-terracotta">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !fullPrompt || !isGeminiConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-olive px-4 py-3 font-semibold text-white transition hover:bg-olive-dark disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI denkt nach…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Tagesplan generieren
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {result.overview && (
              <p className="rounded-2xl bg-olive/10 p-3 text-sm text-olive-dark">
                {result.overview}
              </p>
            )}
            <ol className="space-y-3">
              {result.stops.map((stop, idx) => {
                const excluded = excludedStops.has(idx);
                if (excluded) return null;
                // Renumber based on remaining stops
                const activeIdx = result.stops
                  .slice(0, idx)
                  .filter((_, i) => !excludedStops.has(i)).length + 1;
                return (
                  <li
                    key={stop.order}
                    className="flex items-start gap-3 rounded-2xl bg-cream p-3"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-olive text-sm font-bold text-white">
                      {activeIdx}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{stop.name}</p>
                      {stop.estimatedTime && (
                        <p className="text-xs text-olive-dark">⏰ {stop.estimatedTime}</p>
                      )}
                      <p className="mt-0.5 text-xs text-ink/60">{stop.description}</p>
                      {stop.reason && (
                        <p className="mt-0.5 text-xs text-ink/50">💡 {stop.reason}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-center gap-1">
                      <span className="rounded-full bg-ocker/20 px-2 py-0.5 text-[10px] font-semibold text-ocker">
                        {stop.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExcludedStops((prev) => new Set([...prev, idx]))}
                        className="rounded-full p-1 text-ink/30 hover:bg-terracotta/10 hover:text-terracotta"
                        aria-label="Stop entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            {error && (
              <div className="rounded-2xl bg-terracotta/10 p-3 text-sm text-terracotta">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setResult(null); setError(null); setExcludedStops(new Set()); }}
                className="flex-1 rounded-2xl bg-cream px-4 py-3 font-semibold text-ink/70 hover:bg-cream-dark"
              >
                Nochmal
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={resolving || result.stops.length - excludedStops.size === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
              >
                {resolving ? (
                  <>
                    <Search className="h-4 w-4 animate-pulse" />
                    Verorte Stops…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Übernehmen ({result.stops.length - excludedStops.size} Stops)
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-ink/40">
              Stops werden via Google Places verortet. Fotos, Adressen und Ratings werden automatisch ergänzt.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
