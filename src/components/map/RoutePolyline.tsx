import { Polyline, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef, useState } from 'react';
import type { POI } from '../../data/pois';

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
}

type POIWithCoords = POI & { coords: { lat: number; lng: number } };

interface Props {
  pois: POIWithCoords[]; // ordered, coords guaranteed
  onSummary?: (s: RouteSummary | null) => void;
}

/**
 * Stable key from the ordered coordinate list. Only changes when the actual
 * route changes — NOT on every rerender just because the parent rebuilds the
 * array. Crucial to avoid an infinite Directions-API call loop.
 */
function coordsKey(pois: POIWithCoords[]): string {
  return pois
    .map((p) => `${p.id}:${p.coords.lat.toFixed(6)},${p.coords.lng.toFixed(6)}`)
    .join('|');
}

export function RoutePolyline({ pois, onSummary }: Props) {
  const routesLib = useMapsLibrary('routes');
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);

  // Keep latest values in refs so the effect body can read them without
  // listing `pois`/`onSummary` as dependencies.
  const poisRef = useRef(pois);
  poisRef.current = pois;
  const onSummaryRef = useRef(onSummary);
  onSummaryRef.current = onSummary;

  // Stable string key — referenced inside the effect so the linter sees it
  // as actually used, and it changes only when the route itself changes.
  const key = coordsKey(pois);

  useEffect(() => {
    // Read via ref to avoid listing `pois` as a dep (would trigger infinite loop
    // because the parent rebuilds the array on every render). `key` captures
    // the route identity.
    void key;
    const current = poisRef.current;
    const notifySummary = (s: RouteSummary | null) => onSummaryRef.current?.(s);

    if (!routesLib || current.length < 2) {
      setPath((prev) => (prev.length === 0 ? prev : []));
      notifySummary(null);
      return;
    }

    const service = new routesLib.DirectionsService();
    const origin = current[0].coords;
    const destination = current[current.length - 1].coords;
    const waypoints = current.slice(1, -1).map((p) => ({
      location: p.coords,
      stopover: true,
    }));

    let cancelled = false;

    service
      .route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.WALKING,
        optimizeWaypoints: false,
      })
      .then((res) => {
        if (cancelled) return;
        const route = res.routes[0];
        if (!route) {
          setPath([]);
          notifySummary(null);
          return;
        }
        const overview = route.overview_path.map((p) => ({
          lat: p.lat(),
          lng: p.lng(),
        }));
        setPath(overview);

        const totals = route.legs.reduce(
          (acc, leg) => ({
            distance: acc.distance + (leg.distance?.value ?? 0),
            duration: acc.duration + (leg.duration?.value ?? 0),
          }),
          { distance: 0, duration: 0 },
        );
        notifySummary({
          distanceMeters: totals.distance,
          durationSeconds: totals.duration,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPath(current.map((p) => p.coords));
        notifySummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [routesLib, key]);

  if (path.length < 2) return null;

  return (
    <Polyline
      path={path}
      strokeColor="#C96F4A"
      strokeOpacity={0.9}
      strokeWeight={5}
    />
  );
}
