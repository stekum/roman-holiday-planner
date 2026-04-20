import { Polyline, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef, useState } from 'react';
import type { POI } from '../../data/pois';

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  /** Per-leg data: legs[0] = stop 1→2, legs[1] = stop 2→3, etc. */
  legs: RouteLeg[];
}

type POIWithCoords = POI & { coords: { lat: number; lng: number } };

interface Props {
  pois: POIWithCoords[];
  /** If set, route starts and ends at homebase (shown as dashed legs). */
  homebase?: { lat: number; lng: number };
  onSummary?: (s: RouteSummary | null) => void;
}

// #178: LRU-Cache für DirectionsService-Calls — verhindert redundante
// API-Calls bei gleichen Stop-Kombis (recalcs, HMR, Tab-Switches).
const DIRECTIONS_CACHE = new Map<string, google.maps.DirectionsResult>();
const DIRECTIONS_CACHE_MAX = 20;

function directionsKey(req: google.maps.DirectionsRequest): string {
  const round = (n: number) => n.toFixed(6);
  const o = req.origin as google.maps.LatLngLiteral;
  const d = req.destination as google.maps.LatLngLiteral;
  const wps = (req.waypoints ?? [])
    .map((w) => {
      const loc = w.location as google.maps.LatLngLiteral;
      return `${round(loc.lat)},${round(loc.lng)}`;
    })
    .join('|');
  const opt = req.optimizeWaypoints ? '+opt' : '';
  return `${round(o.lat)},${round(o.lng)}→${round(d.lat)},${round(d.lng)}[${wps}]${req.travelMode}${opt}`;
}

async function cachedRoute(
  service: google.maps.DirectionsService,
  req: google.maps.DirectionsRequest,
): Promise<google.maps.DirectionsResult> {
  const key = directionsKey(req);
  const cached = DIRECTIONS_CACHE.get(key);
  if (cached) {
    // LRU touch
    DIRECTIONS_CACHE.delete(key);
    DIRECTIONS_CACHE.set(key, cached);
    return cached;
  }
  const result = await service.route(req);
  if (DIRECTIONS_CACHE.size >= DIRECTIONS_CACHE_MAX) {
    const oldest = DIRECTIONS_CACHE.keys().next().value;
    if (oldest) DIRECTIONS_CACHE.delete(oldest);
  }
  DIRECTIONS_CACHE.set(key, result);
  return result;
}

function coordsKey(
  pois: POIWithCoords[],
  homebase?: { lat: number; lng: number },
): string {
  const hb = homebase
    ? `hb:${homebase.lat.toFixed(6)},${homebase.lng.toFixed(6)}|`
    : '';
  return (
    hb +
    pois
      .map(
        (p) =>
          `${p.id}:${p.coords.lat.toFixed(6)},${p.coords.lng.toFixed(6)}`,
      )
      .join('|')
  );
}

export function RoutePolyline({ pois, homebase, onSummary }: Props) {
  const routesLib = useMapsLibrary('routes');
  const [mainPath, setMainPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [homeLegStart, setHomeLegStart] = useState<google.maps.LatLngLiteral[]>(
    [],
  );
  const [homeLegEnd, setHomeLegEnd] = useState<google.maps.LatLngLiteral[]>([]);

  const poisRef = useRef(pois);
  poisRef.current = pois;
  const homebaseRef = useRef(homebase);
  homebaseRef.current = homebase;
  const onSummaryRef = useRef(onSummary);
  onSummaryRef.current = onSummary;

  const key = coordsKey(pois, homebase);

  useEffect(() => {
    void key;
    const current = poisRef.current;
    const hb = homebaseRef.current;
    const notifySummary = (s: RouteSummary | null) =>
      onSummaryRef.current?.(s);

    if (!routesLib || current.length < 2) {
      setMainPath((prev) => (prev.length === 0 ? prev : []));
      setHomeLegStart([]);
      setHomeLegEnd([]);
      notifySummary(null);
      return;
    }

    const service = new routesLib.DirectionsService();

    // Main tour route: first POI → last POI with intermediate waypoints
    const origin = current[0].coords;
    const destination = current[current.length - 1].coords;
    const waypoints = current.slice(1, -1).map((p) => ({
      location: p.coords,
      stopover: true,
    }));

    let cancelled = false;

    const mainRequest = cachedRoute(service, {
      origin,
      destination,
      waypoints,
      travelMode: google.maps.TravelMode.WALKING,
      optimizeWaypoints: false,
    })
      .then((res) => {
        if (cancelled) return null;
        const route = res.routes[0];
        if (!route) {
          setMainPath([]);
          return null;
        }
        const overview = route.overview_path.map((p) => ({
          lat: p.lat(),
          lng: p.lng(),
        }));
        setMainPath(overview);
        return route;
      })
      .catch(() => {
        if (cancelled) return null;
        setMainPath(current.map((p) => p.coords));
        return null;
      });

    // Homebase legs: homebase → first POI, last POI → homebase
    const homeLegsRequest =
      hb
        ? Promise.all([
            cachedRoute(service, {
              origin: hb,
              destination: current[0].coords,
              travelMode: google.maps.TravelMode.WALKING,
            })
              .then((res) => {
                if (cancelled) return;
                const r = res.routes[0];
                if (r) {
                  setHomeLegStart(
                    r.overview_path.map((p) => ({
                      lat: p.lat(),
                      lng: p.lng(),
                    })),
                  );
                }
              })
              .catch(() => {
                if (cancelled) return;
                setHomeLegStart([hb, current[0].coords]);
              }),
            cachedRoute(service, {
              origin: current[current.length - 1].coords,
              destination: hb,
              travelMode: google.maps.TravelMode.WALKING,
            })
              .then((res) => {
                if (cancelled) return;
                const r = res.routes[0];
                if (r) {
                  setHomeLegEnd(
                    r.overview_path.map((p) => ({
                      lat: p.lat(),
                      lng: p.lng(),
                    })),
                  );
                }
              })
              .catch(() => {
                if (cancelled) return;
                setHomeLegEnd([
                  current[current.length - 1].coords,
                  hb,
                ]);
              }),
          ])
        : Promise.resolve().then(() => {
            setHomeLegStart([]);
            setHomeLegEnd([]);
          });

    // Compute summary from all legs combined
    Promise.all([mainRequest, homeLegsRequest]).then(([mainRoute]) => {
      if (cancelled || !mainRoute) {
        notifySummary(null);
        return;
      }
      const legs: RouteLeg[] = mainRoute.legs.map((leg) => ({
        distanceMeters: leg.distance?.value ?? 0,
        durationSeconds: leg.duration?.value ?? 0,
      }));
      const totals = legs.reduce(
        (acc, leg) => ({
          distance: acc.distance + leg.distanceMeters,
          duration: acc.duration + leg.durationSeconds,
        }),
        { distance: 0, duration: 0 },
      );
      notifySummary({
        distanceMeters: totals.distance,
        durationSeconds: totals.duration,
        legs,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [routesLib, key]);

  return (
    <>
      {/* Homebase → First stop (dashed) */}
      {homeLegStart.length >= 2 && (
        <Polyline
          path={homeLegStart}
          strokeColor="#3B2E2A"
          strokeOpacity={0}
          icons={[
            {
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.5, scale: 3 },
              offset: '0',
              repeat: '14px',
            },
          ]}
        />
      )}

      {/* Main tour route (solid) */}
      {mainPath.length >= 2 && (
        <Polyline
          path={mainPath}
          strokeColor="#C96F4A"
          strokeOpacity={0.9}
          strokeWeight={5}
        />
      )}

      {/* Last stop → Homebase (dashed) */}
      {homeLegEnd.length >= 2 && (
        <Polyline
          path={homeLegEnd}
          strokeColor="#3B2E2A"
          strokeOpacity={0}
          icons={[
            {
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.5, scale: 3 },
              offset: '0',
              repeat: '14px',
            },
          ]}
        />
      )}
    </>
  );
}
