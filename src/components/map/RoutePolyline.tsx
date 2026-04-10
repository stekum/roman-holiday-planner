import { Polyline, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef, useState } from 'react';
import type { POI } from '../../data/pois';

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
}

type POIWithCoords = POI & { coords: { lat: number; lng: number } };

interface Props {
  pois: POIWithCoords[];
  /** If set, route starts and ends at homebase (shown as dashed legs). */
  homebase?: { lat: number; lng: number };
  onSummary?: (s: RouteSummary | null) => void;
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

    const mainRequest = service
      .route({
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
            service
              .route({
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
            service
              .route({
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
      const totals = mainRoute.legs.reduce(
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
