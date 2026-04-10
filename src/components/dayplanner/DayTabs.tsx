import { formatDayLabel } from '../../lib/dates';
import type { DayWeather } from '../../lib/weather';

interface Props {
  days: string[];
  activeDay: string;
  onChange: (day: string) => void;
  counts: Record<string, number>;
  weather: Record<string, DayWeather>;
}

export function DayTabs({ days, activeDay, onChange, counts, weather }: Props) {
  if (days.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex gap-2">
        {days.map((day, idx) => {
          const active = day === activeDay;
          const count = counts[day] ?? 0;
          const w = weather[day];
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              className={`flex flex-shrink-0 flex-col items-center rounded-2xl px-3 py-2 text-center text-xs font-semibold transition ${
                active
                  ? 'bg-olive text-white shadow-md'
                  : 'bg-white text-ink/70 shadow-sm hover:bg-cream'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                Tag {idx + 1}
              </span>
              <span className="text-sm">{formatDayLabel(day)}</span>
              {w && (
                <span
                  className={`mt-0.5 text-[11px] ${
                    active ? 'opacity-90' : 'opacity-70'
                  }`}
                  title={w.label}
                >
                  {w.icon} {w.tempMax}°
                </span>
              )}
              {count > 0 && (
                <span
                  className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] ${
                    active ? 'bg-white/20' : 'bg-olive/15 text-olive'
                  }`}
                >
                  {count} {count === 1 ? 'Ort' : 'Orte'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
