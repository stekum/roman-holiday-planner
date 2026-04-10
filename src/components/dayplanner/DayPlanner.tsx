import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { POI } from '../../data/pois';
import type { Family, Settings } from '../../settings/types';
import type { RouteSummary as Summary } from '../map/RoutePolyline';
import type { DayWeather } from '../../lib/weather';
import { isGeminiConfigured } from '../../lib/gemini';
import { DayTabs } from './DayTabs';
import { RouteSummary } from './RouteSummary';
import { AiDayPlannerModal } from './AiDayPlannerModal';

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
  /** Callback when AI planner generates POIs + order. */
  onAiAccept: (pois: POI[], order: string[]) => void;
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
  onAiAccept,
}: Props) {
  const routesLib = useMapsLibrary('routes');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Clear optimize banner when switching days
  const prevDay = useRef(activeDay);
  if (prevDay.current !== activeDay) {
    prevDay.current = activeDay;
    if (optimizeResult) setOptimizeResult(null);
  }

  const selected = dayOrder
    .map((id) => pois.find((p) => p.id === id))
    .filter(Boolean) as POI[];

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

      <RouteSummary summary={summary} stops={selected.length} />

      {selected.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-ink/50 shadow-sm">
          Wechsle zu <strong>Entdecken</strong> und füge Orte mit „+ Zum Tag"
          hinzu.
        </div>
      ) : (
        <ol className="space-y-3">
          {selected.map((poi, idx) => {
            const family = getFamily(poi.familyId);
            return (
              <li
                key={poi.id}
                className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm shadow-ink/5"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: family?.color ?? '#C96F4A' }}
                >
                  {idx + 1}
                </div>
                <img
                  src={poi.image}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover"
                />
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
              </li>
            );
          })}
        </ol>
      )}

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
