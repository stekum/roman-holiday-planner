import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Footprints, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { POI } from '../../data/pois';
import { CATEGORY_EMOJI } from '../../data/pois';
import type { Family, Settings } from '../../settings/types';
import type { RouteSummary as Summary } from '../map/RoutePolyline';
import type { DayWeather } from '../../lib/weather';
import { isGeminiConfigured } from '../../lib/gemini';
import { track } from '../../lib/analytics';
import { DayTabs } from './DayTabs';
import { RouteSummary } from './RouteSummary';
import { AiDayPlannerModal } from './AiDayPlannerModal';
import { AiKidFriendlyPanel } from './AiKidFriendlyPanel';
import { AiPostTripPanel } from './AiPostTripPanel';
import { getHomebaseForDay, getHomebases } from '../../settings/homebases';
import { getTransitDayForDate } from '../../settings/transitDays';
import { TransitDayCard } from './TransitDayCard';
import { DayBudgetCard } from './DayBudgetCard';
import { getTripConfig, currencyFromCountry } from '../../settings/tripConfig';
import type { DayBudget } from '../../firebase/useWorkspace';

interface Props {
  pois: POI[];
  days: string[];
  activeDay: string;
  onDayChange: (day: string) => void;
  dayOrder: string[];
  dayCounts: Record<string, number>;
  weather: Record<string, DayWeather>;
  getFamily: (id: string) => Family | undefined;
  summary: Summary | null;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Called with the optimized order of POI ids. */
  onReorder: (newOrder: string[]) => void;
  /** Full settings for AI planner context. */
  settings: Settings;
  /** AI-generated briefing text for this day. */
  dayBriefing: string;
  /** AI-generated day description (overview text). */
  dayDescription: string;
  /** Whether the AI briefing is currently being generated. */
  briefingLoading: boolean;
  /** Visible error message for briefing generation failures. */
  briefingError?: string | null;
  /** Trigger a fresh day briefing for the active day. */
  onGenerateBriefing: () => void;
  /** Callback when AI planner generates POIs + order + overview. */
  onAiAccept: (pois: POI[], order: string[], overview: string) => void;
  /** My family id — used for kid-friendly suggestions added to workspace. */
  myFamilyId: string;
  /** Add a POI to the workspace (from kid-friendly suggestions). */
  onAddPoi: (poi: POI) => void;
  /** Tages-Budget fuer den aktiven Tag (optional). */
  dayBudget?: DayBudget;
  /** Tages-Budget setzen/aktualisieren. */
  onSetDayBudget: (dayIso: string, b: DayBudget) => void;
  /** Post-Trip-Analyse (#43) — trip-weit, nicht pro Tag. */
  postTripAnalysis: string;
  onSavePostTripAnalysis: (analysis: string) => void | Promise<void>;
  /**
   * #258: Click-to-highlight im Tagesplan. Setzt highlightedPoiId in App,
   * Map zentriert + InfoWindow geht auf. Same Handler wie PoiList.onHighlight.
   */
  onHighlight?: (id: string) => void;
  highlightedPoiId?: string | null;
}

export function DayPlanner({
  pois,
  days,
  activeDay,
  onDayChange,
  dayOrder,
  dayCounts,
  weather,
  getFamily,
  summary,
  onMove,
  onRemove,
  onClear,
  onReorder,
  settings,
  dayBriefing,
  dayDescription,
  briefingLoading,
  briefingError,
  onGenerateBriefing,
  onAiAccept,
  myFamilyId,
  onAddPoi,
  dayBudget,
  onSetDayBudget,
  postTripAnalysis,
  onSavePostTripAnalysis,
  onHighlight,
  highlightedPoiId,
}: Props) {
  const routesLib = useMapsLibrary('routes');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // #78: ist dieser Tag als Transit-Tag markiert? Dann rendert der Body
  // unten eine Transit-Karte statt POI-Routing.
  const transitDay = getTransitDayForDate(settings, activeDay);

  // Per-day Homebase für diesen activeDay (#74). Fällt auf Catch-all oder
  // erste Homebase zurück wenn kein Range matcht. Ersetzt das frühere
  // Singleton-`settings.homebase`.
  const dayHomebase = getHomebaseForDay(getHomebases(settings), activeDay);

  // Clear optimize banner when switching days
  const prevDay = useRef(activeDay);
  if (prevDay.current !== activeDay) {
    prevDay.current = activeDay;
    if (optimizeResult) setOptimizeResult(null);
  }

  const selected = dayOrder
    .map((id) => pois.find((p) => p.id === id))
    .filter(Boolean) as POI[];
  const canGenerateBriefing = selected.length > 0;
  const briefingButtonLabel = dayBriefing
    ? 'Briefing aktualisieren'
    : 'Briefing erzeugen';

  const canOptimize =
    !!routesLib && selected.length >= 3 && selected.every((p) => !!p.coords);

  const handleOptimize = async () => {
    if (!routesLib || selected.length < 3) return;
    setOptimizing(true);
    setOptimizeResult(null);

    try {
      const withCoords = selected.filter((p) => p.coords) as (POI & {
        coords: { lat: number; lng: number };
      })[];

      const service = new routesLib.DirectionsService();
      const origin = withCoords[0].coords;
      const destination = withCoords[withCoords.length - 1].coords;
      const waypoints = withCoords.slice(1, -1).map((p) => ({
        location: p.coords,
        stopover: true,
      }));

      const result = await service.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.WALKING,
        optimizeWaypoints: true,
      });

      const route = result.routes[0];
      if (!route) {
        setOptimizeResult('Keine Route gefunden.');
        return;
      }

      // waypoint_order maps the middle waypoints to their optimal position.
      // First and last stop stay fixed (origin/destination).
      const waypointOrder = route.waypoint_order;
      const middlePois = withCoords.slice(1, -1);
      const optimizedMiddle = waypointOrder.map((i: number) => middlePois[i]);
      const optimizedFull = [
        withCoords[0],
        ...optimizedMiddle,
        withCoords[withCoords.length - 1],
      ];
      const newOrder = optimizedFull.map((p) => p.id);

      // Check if order actually changed
      const changed = newOrder.some((id, i) => id !== dayOrder[i]);
      if (!changed) {
        setOptimizeResult('Reihenfolge ist bereits optimal! 👌');
        return;
      }

      track('route_optimized');
      onReorder(newOrder);

      // Calculate saved distance
      const totalOptimized = route.legs.reduce(
        (sum, leg) => sum + (leg.distance?.value ?? 0),
        0,
      );
      const savedKm =
        summary && summary.distanceMeters > totalOptimized
          ? ((summary.distanceMeters - totalOptimized) / 1000).toFixed(1)
          : null;

      setOptimizeResult(
        savedKm
          ? `Route optimiert — ${savedKm} km kürzer! 🎉`
          : 'Route optimiert! 🎉',
      );
    } catch {
      setOptimizeResult('Optimierung fehlgeschlagen (API-Fehler).');
    } finally {
      setOptimizing(false);
    }
  };

  if (days.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-3xl bg-white p-8 text-center text-ink/60 shadow-sm">
          Setze zuerst in den <strong>Einstellungen</strong> einen Reise-Zeitraum.
        </div>
      </div>
    );
  }

  // #78: Transit-Tag → Tagesprogramm wird durch eine Transit-Karte
  // ersetzt; Tab-Navigation zwischen Tagen bleibt funktional.
  if (transitDay) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <DayTabs
          days={days}
          activeDay={activeDay}
          onChange={onDayChange}
          counts={dayCounts}
          weather={weather}
        />
        <TransitDayCard transitDay={transitDay} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <DayTabs
        days={days}
        activeDay={activeDay}
        onChange={onDayChange}
        counts={dayCounts}
        weather={weather}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tagestour
          </h2>
          <p className="text-sm text-ink/60">
            Reihenfolge mit den Pfeilen ändern. Route wird zu Fuß geplant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isGeminiConfigured && (
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-terracotta px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-terracotta-dark"
            >
              <Sparkles className="h-4 w-4" />
              AI Tagesplan
            </button>
          )}
          {isGeminiConfigured && (
            <button
              type="button"
              onClick={onGenerateBriefing}
              disabled={!canGenerateBriefing || briefingLoading}
              className="flex items-center gap-1 rounded-full bg-ocker px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            >
              {briefingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {briefingLoading ? 'Erzeuge Briefing…' : briefingButtonLabel}
            </button>
          )}
          {canOptimize && (
            <button
              type="button"
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex items-center gap-1 rounded-full bg-olive px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-olive-dark disabled:opacity-60"
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Optimieren
            </button>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm text-ink/60 shadow-sm hover:text-terracotta"
            >
              <Trash2 className="h-4 w-4" />
              Leeren
            </button>
          )}
        </div>
      </div>

      {optimizeResult && (
        <div
          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
            optimizeResult.includes('🎉') || optimizeResult.includes('👌')
              ? 'bg-olive/10 text-olive-dark'
              : 'bg-terracotta/10 text-terracotta'
          }`}
        >
          {optimizeResult}
        </div>
      )}

      {briefingError && (
        <div className="rounded-2xl bg-terracotta/10 px-4 py-2 text-sm font-semibold text-terracotta">
          {briefingError}
        </div>
      )}

      <RouteSummary
        summary={summary}
        stops={selected.length}
        waypoints={selected.flatMap((p) => p.coords ? [p.coords] : [])}
        homebase={dayHomebase?.coords}
      />

      <DayBriefingCard
        briefing={dayBriefing}
        weather={weather[activeDay]}
        pois={selected}
        summary={summary}
      />

      {selected.length > 0 && dayDescription && (
        <div className="rounded-2xl bg-olive/10 px-4 py-3 text-sm text-olive-dark">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-olive/60">
            AI Tagesplan
          </p>
          {dayDescription}
        </div>
      )}

      <DayBudgetCard
        key={activeDay}
        dayIso={activeDay}
        budget={dayBudget}
        onChange={onSetDayBudget}
        currencySymbol={currencyFromCountry(getTripConfig(settings).country)}
      />

      {isGeminiConfigured && (
        <AiKidFriendlyPanel
          dayPois={selected}
          dayLabel={activeDay}
          homebase={dayHomebase}
          families={settings.families}
          myFamilyId={myFamilyId}
          onAddPoi={onAddPoi}
          tripConfig={getTripConfig(settings)}
        />
      )}

      {selected.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-ink/50 shadow-sm">
          Wechsle zu <strong>Entdecken</strong> und füge Orte mit „+ Zum Tag"
          hinzu.
        </div>
      ) : (
        <ol className="space-y-1">
          {selected.map((poi, idx) => {
            const family = getFamily(poi.familyId);
            const leg = summary?.legs?.[idx - 1];
            return (
              <li key={poi.id}>
                {idx > 0 && leg && (
                  <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-ink/40">
                    <Footprints className="h-3 w-3" />
                    <span>
                      {Math.round(leg.durationSeconds / 60)} min
                      {' · '}
                      {leg.distanceMeters < 1000
                        ? `${Math.round(leg.distanceMeters)} m`
                        : `${(leg.distanceMeters / 1000).toFixed(1)} km`}
                    </span>
                  </div>
                )}
                <div
                  className={`flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm shadow-ink/5 ${
                    highlightedPoiId === poi.id
                      ? 'ring-2 ring-terracotta/60 ring-offset-2 ring-offset-cream'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onHighlight?.(poi.id)}
                    disabled={!onHighlight}
                    aria-label={`${poi.title} auf Karte zeigen`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left transition enabled:hover:bg-cream/40 focus:outline-none enabled:focus:ring-2 enabled:focus:ring-terracotta/40 disabled:cursor-default"
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                      style={{ backgroundColor: family?.color ?? '#C96F4A' }}
                    >
                      {idx + 1}
                    </div>
                    {poi.image?.trim() ? (
                      <img
                        src={poi.image}
                        alt=""
                        className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover bg-cream"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl ${poi.image?.trim() ? 'hidden' : ''}`}>
                      {CATEGORY_EMOJI[poi.category]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-lg text-ink"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {poi.title}
                      </p>
                      <p className="text-xs text-ink/50">
                        {poi.category}
                        {family ? ` · ${family.name}` : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMove(poi.id, 'up')}
                      className="rounded-full p-1 text-ink/60 hover:bg-cream disabled:opacity-30"
                      aria-label="Nach oben"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selected.length - 1}
                      onClick={() => onMove(poi.id, 'down')}
                      className="rounded-full p-1 text-ink/60 hover:bg-cream disabled:opacity-30"
                      aria-label="Nach unten"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(poi.id)}
                    className="rounded-full p-1.5 text-ink/40 hover:bg-terracotta/10 hover:text-terracotta"
                    aria-label="Aus Tag entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <AiPostTripPanel
        pois={pois}
        families={settings.families}
        settings={settings}
        analysis={postTripAnalysis}
        onSave={onSavePostTripAnalysis}
      />

      <AiDayPlannerModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        dayLabel={`Tag ${days.indexOf(activeDay) + 1} — ${activeDay}`}
        dayIso={activeDay}
        settings={settings}
        existingPoiNames={pois.filter((p) => p.coords).map((p) => p.title)}
        onAccept={onAiAccept}
      />
    </div>
  );
}

function getWarningChip(
  weather?: DayWeather,
  pois?: POI[],
  summary?: Summary | null,
) {
  if (weather && weather.code >= 80) {
    return `Hinweis: Schauer moeglich`;
  }
  if (weather && [51, 53, 55, 61, 63, 65].includes(weather.code)) {
    return `Hinweis: Regen einplanen`;
  }
  if (pois?.some((poi) => !poi.openingHours?.length)) {
    return 'Hinweis: Zeiten pruefen';
  }
  if (summary && summary.durationSeconds >= 2 * 60 * 60) {
    return 'Hinweis: Langer Tourtag';
  }
  return 'Hinweis: Locker geplant';
}

function getHighlightChip(pois: POI[]) {
  const ratedPoi = [...pois]
    .filter((poi) => poi.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

  const highlightPoi =
    ratedPoi ??
    pois.find((poi) => poi.category === 'Kultur') ??
    pois[0];

  return highlightPoi ? `Highlight: ${highlightPoi.title}` : null;
}

function DayBriefingCard({
  briefing,
  weather,
  pois,
  summary,
}: {
  briefing: string;
  weather?: DayWeather;
  pois: POI[];
  summary: Summary | null;
}) {
  const [expanded, setExpanded] = useState(false);

  // #169: If no briefing for the current day OR no stops planned, return null
  // here (inside the component) instead of gating the JSX in the parent.
  // Conditional gating in the parent caused React to mount new instances
  // without unmounting old ones when dayBriefing flipped truthy/falsy during
  // tab-switches — 3-6 ghost cards accumulated. Always rendering the component
  // and letting it return null keeps the React instance stable across briefing
  // changes. The `pois.length === 0` check hides stale briefings when the user
  // empties a day's plan without clicking "Tagesplan leeren" (the stale
  // Firestore-stored briefing/description would otherwise still show).
  if (!briefing || pois.length === 0) return null;

  const canCollapse = briefing.length > 320;
  const chips = [
    weather
      ? `${weather.icon} ${weather.label}, ${weather.tempMin}-${weather.tempMax} °C`
      : null,
    getWarningChip(weather, pois, summary),
    getHighlightChip(pois),
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-2xl bg-ocker/10 px-4 py-3 text-sm text-ink">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            AI Tages-Briefing
          </p>
          <p className="text-xs text-ink/45">
            Kurzueberblick, Timing-Hinweise und praktische Tipps.
          </p>
        </div>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex-shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink/60 shadow-sm transition hover:text-terracotta"
          >
            {expanded ? 'Weniger' : 'Mehr lesen'}
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="max-w-full truncate rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink/65 shadow-sm"
              title={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      <div className={`relative ${expanded || !canCollapse ? '' : 'max-h-40 overflow-hidden'}`}>
        <p className="whitespace-pre-line leading-6">
          {briefing}
        </p>
        {!expanded && canCollapse && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ocker/10 to-transparent" />
        )}
      </div>
    </div>
  );
}
