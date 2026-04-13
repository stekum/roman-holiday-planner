import { Clock, ExternalLink, Footprints } from 'lucide-react';
import type { RouteSummary as Summary } from '../map/RoutePolyline';

interface Props {
  summary: Summary | null;
  stops: number;
  /** Ordered waypoints for "Open in Google Maps" deep-link. */
  waypoints?: { lat: number; lng: number }[];
  /** Homebase coords — used as origin/destination in the deep-link. */
  homebase?: { lat: number; lng: number };
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

function buildGoogleMapsRouteUrl(
  waypoints: { lat: number; lng: number }[],
  homebase?: { lat: number; lng: number },
): string {
  const origin = homebase ?? waypoints[0];
  const destination = homebase ?? waypoints[waypoints.length - 1];
  const mid = homebase
    ? waypoints
    : waypoints.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'walking',
  });
  if (mid.length > 0) {
    params.set('waypoints', mid.map((p) => `${p.lat},${p.lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function RouteSummary({ summary, stops, waypoints, homebase }: Props) {
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
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-olive-dark/70">{stops} Stopps</span>
        {waypoints && waypoints.length >= 2 && (
          <a
            href={buildGoogleMapsRouteUrl(waypoints, homebase)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-olive/20 px-2.5 py-1 text-[10px] font-semibold text-olive-dark hover:bg-olive/30"
          >
            Route öffnen
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
      </div>
    </div>
  );
}
