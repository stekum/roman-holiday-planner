import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import type { RouteSummary as Summary } from '../map/RoutePolyline';
import type { DayWeather } from '../../lib/weather';
import { DayTabs } from './DayTabs';
import { RouteSummary } from './RouteSummary';

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
}: Props) {
  const selected = dayOrder
    .map((id) => pois.find((p) => p.id === id))
    .filter(Boolean) as POI[];

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
    </div>
  );
}
