import { Clock, Footprints } from 'lucide-react';
import type { RouteSummary as Summary } from '../map/RoutePolyline';

interface Props {
  summary: Summary | null;
  stops: number;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function RouteSummary({ summary, stops }: Props) {
  if (stops < 2) {
    return (
      <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/60">
        Wähle mindestens zwei Orte, um eine Route zu generieren.
      </div>
    );
  }
  if (!summary) {
    return (
      <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/60">
        Route wird berechnet…
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-olive/10 px-4 py-3 text-olive-dark">
      <div className="flex items-center gap-1.5">
        <Footprints className="h-4 w-4" />
        <span className="font-semibold">{formatDistance(summary.distanceMeters)}</span>
      </div>
      <div className="h-4 w-px bg-olive/30" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        <span className="font-semibold">{formatDuration(summary.durationSeconds)}</span>
      </div>
      <div className="ml-auto text-xs text-olive-dark/70">{stops} Stopps</div>
    </div>
  );
}
