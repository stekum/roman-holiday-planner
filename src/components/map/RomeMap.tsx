import { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Eye, Navigation } from 'lucide-react';
import { CATEGORY_EMOJI, type POI } from '../../data/pois';
import type { Family, Homebase, TripConfig } from '../../settings/types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../settings/tripConfig';
import { RoutePolyline, type RouteSummary } from './RoutePolyline';

const CATEGORY_GRADIENT: Record<POI['category'], string> = {
  Kultur: 'linear-gradient(135deg, #D4A24C 0%, #A85637 100%)',
  Pizza: 'linear-gradient(135deg, #E8C78A 0%, #C96F4A 100%)',
  Gelato: 'linear-gradient(135deg, #F1EADC 0%, #8A7CA8 100%)',
  Trattoria: 'linear-gradient(135deg, #C96F4A 0%, #7A2E2E 100%)',
  Aperitivo: 'linear-gradient(135deg, #D4A24C 0%, #7A2E2E 100%)',
  Instagram: 'linear-gradient(135deg, #C96F4A 0%, #8A7CA8 100%)',
  Sonstiges: 'linear-gradient(135deg, #6B7A3F 0%, #4F5B2D 100%)',
};

interface Props {
  pois: POI[];
  /** When set, only markers whose id is in this Set are shown; others get position=null.
   *  null = show all markers. */
  visiblePoiIds?: Set<string> | null;
  mode: 'discover' | 'plan';
  /** Ordered POI ids for the currently active day (plan mode). */
  planOrder?: string[];
  families: Family[];
  /**
   * Aktive Homebase fuer den gerade angezeigten Tag (Trip-Tab) bzw. den
   * heutigen Tag (Entdecken). Wird groesser + markant gerendert + ist
   * Source fuer Map-Center, Routen-Origin und InfoWindow.
   */
  homebase?: Homebase;
  /**
   * Alle Homebases dieses Trips (#74). Werden zusaetzlich als kleinere
   * Marker auf der Karte gezeigt — beim Rauszoomen sieht man alle
   * Stationen einer Multi-City-Reise (Tokyo / Kyoto / Osaka). Der
   * `homebase`-Eintrag (active) wird hervorgehoben.
   */
  homebases?: readonly Homebase[];
  /** Active trip — provides per-trip map center + default zoom (#73). */
  tripConfig?: TripConfig;
  myLocation?: { lat: number; lng: number; accuracy: number } | null;
  /** External selection — app-controlled. Pans map and shows InfoWindow. */
  highlightedPoiId?: string | null;
  /** When set, shows Street View panorama at this location (shares map container). */
  streetViewPosition?: { lat: number; lng: number } | null;
  /** Called when the Street View panorama is dismissed. */
  onStreetViewClose?: () => void;
  /** Called when the user requests Street View from an InfoWindow. */
  onStreetViewRequest?: (coords: { lat: number; lng: number }) => void;
  /** When true the map cursor is a crosshair and clicks fire onMapClick instead of deselecting. */
  pickMode?: boolean;
  onMarkerClick?: (poi: POI) => void;
  onMapClick?: (pick: { coords: { lat: number; lng: number }; placeId?: string }) => void;
  /** Called when user clicks map background — parent should clear highlightedPoiId. */
  onDismiss?: () => void;
  onRouteSummary?: (s: RouteSummary | null) => void;
}

function darken(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const d = (v: number) => Math.max(0, Math.floor(v * 0.75));
  return `#${[d(r), d(g), d(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Imperatively pans the map when the highlighted POI changes. */
function MapFocus({
  target,
}: {
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    const currentZoom = map.getZoom() ?? 14;
    if (currentZoom < 15) map.setZoom(16);
  }, [map, target]);
  return null;
}

/**
 * Pan the map when the trip's effective center (Homebase → TripConfig.center →
 * Rom-Default) changes WITHIN the same workspace. The `defaultCenter`-Prop of
 * `<GMap>` is only read at mount; wenn der User nachträglich im aktiven Trip
 * Homebase/CityConfig ändert, bleibt die Map sonst auf dem alten Center stehen.
 * Workspace-Switch wird weiterhin per key-Remount gehandhabt (App.tsx).
 */
function TripCenterSync({
  center,
}: {
  center: { lat: number; lng: number };
}) {
  const map = useMap();
  const lastAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const sig = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
    // Erste Anwendung: Map hat den Center bereits als defaultCenter beim
    // Mount bekommen — nichts zu tun. Nur bei echter Änderung panTo.
    if (lastAppliedRef.current === null) {
      lastAppliedRef.current = sig;
      return;
    }
    if (lastAppliedRef.current === sig) return;
    lastAppliedRef.current = sig;
    map.panTo(center);
  }, [map, center]);
  return null;
}

/**
 * Switches the map into Street View panorama mode when `position` is set.
 * Uses the map's built-in StreetViewPanorama which shares the same DOM
 * container — no new window, no leaving the app. Fires `onClose` when
 * the user dismisses the panorama via the built-in X button.
 */
function StreetViewController({
  position,
  onClose,
}: {
  position: { lat: number; lng: number } | null;
  onClose?: () => void;
}) {
  const map = useMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!map) return;
    const pano = map.getStreetView();

    if (position) {
      pano.setOptions({
        position,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: true,
        fullscreenControl: false,
        enableCloseButton: true,
      });
      pano.setVisible(true);
    } else if (pano.getVisible()) {
      pano.setVisible(false);
    }

    const listener = pano.addListener('visible_changed', () => {
      if (!pano.getVisible() && position) {
        onCloseRef.current?.();
      }
    });

    return () => {
      listener.remove();
    };
  }, [map, position]);

  return null;
}

/**
 * Fits the map viewport to show all given points (+ some padding).
 * Only fires when the set of points actually changes (stable key).
 */
function MapFitBounds({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  const lastKeyRef = useRef('');
  const key = points
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .join('|');

  useEffect(() => {
    if (!map || points.length === 0 || key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, key, points]);
  return null;
}

/** Single POI marker with imperative visibility via marker.map */
function PoiMarker({
  poi,
  hidden,
  bg,
  border,
  label,
  onSelect,
}: {
  poi: POI & { coords: { lat: number; lng: number } };
  hidden: boolean;
  bg: string;
  border: string;
  label?: string;
  onSelect: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const map = useMap();

  // The ONLY reliable way to hide an AdvancedMarkerElement:
  // set marker.map = null (removes from canvas) or marker.map = map (adds back).
  // position=null, className="hidden", and React unmount cleanup are all broken
  // in @vis.gl/react-google-maps 1.8.x.
  useEffect(() => {
    if (!marker) return;
    marker.map = hidden ? null : (map ?? null);
  }, [marker, hidden, map]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={poi.coords}
      onClick={hidden ? undefined : onSelect}
    >
      <Pin
        background={bg}
        borderColor={border}
        glyphColor="#FFFFFF"
        glyph={label}
        scale={1.1}
      />
    </AdvancedMarker>
  );
}

export function RomeMap({
  pois,
  visiblePoiIds = null,
  mode,
  planOrder = [],
  families,
  homebase,
  homebases,
  tripConfig,
  myLocation,
  highlightedPoiId,
  streetViewPosition = null,
  onStreetViewClose,
  onStreetViewRequest,
  pickMode = false,
  onMarkerClick,
  onMapClick,
  onDismiss,
  onRouteSummary,
}: Props) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  // Effective selection: external highlight wins, else internal click-to-select
  const selectedId = highlightedPoiId ?? internalSelectedId;

  // When a new external highlight comes in, clear any stale internal selection
  useEffect(() => {
    if (highlightedPoiId) setInternalSelectedId(null);
  }, [highlightedPoiId]);

  const familyMap = new Map(families.map((f) => [f.id, f]));
  const withCoords = pois.filter((p) => !!p.coords) as (POI & {
    coords: { lat: number; lng: number };
  })[];

  const planPois =
    mode === 'plan'
      ? (planOrder
          .map((id) => withCoords.find((p) => p.id === id))
          .filter(Boolean) as (POI & { coords: { lat: number; lng: number } })[])
      : [];

  const visiblePois =
    mode === 'plan' && planPois.length > 0 ? planPois : withCoords;

  // The selected POI may not be in visiblePois (e.g. plan mode filters it out).
  // Fall back to the full withCoords list for lookup.
  const selected =
    (selectedId &&
      (visiblePois.find((p) => p.id === selectedId) ??
        withCoords.find((p) => p.id === selectedId))) ||
    null;

  return (
    <GMap
      mapId="rhp-main"
      defaultCenter={homebase?.coords ?? tripConfig?.center ?? DEFAULT_CENTER}
      defaultZoom={tripConfig?.defaultZoom ?? DEFAULT_ZOOM}
      gestureHandling="greedy"
      disableDefaultUI={false}
      className={`h-full w-full ${pickMode ? 'cursor-crosshair' : ''}`}
      clickableIcons={true}
      onClick={(e) => {
        // Any click on the map background dismisses the InfoWindow
        setInternalSelectedId(null);
        onDismiss?.();

        const latLng = e.detail.latLng;
        if (!latLng || !onMapClick) return;
        const placeId = (e.detail as { placeId?: string }).placeId;
        // In pickMode: always forward. In discover mode: only forward clicks
        // on actual Google POIs (they have a placeId) — blank clicks should
        // not trigger the add flow unintentionally.
        if (!pickMode && !placeId) return;
        e.stop?.();
        onMapClick({ coords: { lat: latLng.lat, lng: latLng.lng }, placeId });
      }}
    >
      <MapFocus
        target={
          selectedId === '__homebase__' && homebase?.coords
            ? homebase.coords
            : selected?.coords ?? null
        }
      />

      <TripCenterSync
        center={homebase?.coords ?? tripConfig?.center ?? DEFAULT_CENTER}
      />

      <StreetViewController
        position={streetViewPosition}
        onClose={onStreetViewClose}
      />

      {mode === 'plan' && planPois.length > 0 && (
        <MapFitBounds
          points={[
            ...(homebase?.coords ? [homebase.coords] : []),
            ...planPois.map((p) => p.coords),
          ]}
        />
      )}

      {visiblePois.map((poi, idx) => {
        const hidden = visiblePoiIds !== null && !visiblePoiIds.has(poi.id);
        const family = familyMap.get(poi.familyId);
        const bg = family?.color ?? '#94999d';
        const border = darken(bg);
        const label = mode === 'plan' && planPois.length > 0 ? String(idx + 1) : undefined;
        return (
          <PoiMarker
            key={poi.id}
            poi={poi}
            hidden={hidden}
            bg={bg}
            border={border}
            label={label}
            onSelect={() => {
              setInternalSelectedId(poi.id);
              onMarkerClick?.(poi);
            }}
          />
        );
      })}

      {myLocation && (
        <AdvancedMarker
          position={{ lat: myLocation.lat, lng: myLocation.lng }}
          zIndex={1000}
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute h-8 w-8 animate-ping rounded-full bg-blue-400/30" />
            <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
          </div>
        </AdvancedMarker>
      )}

      {/* Inaktive Homebases (#74): kleinere, halbtransparente Marker für
          alle nicht-aktiven Trip-Stationen. So sieht man beim Rauszoomen
          die ganze Multi-City-Route (Tokyo/Kyoto/Osaka). */}
      {homebases?.map((hb, i) => {
        if (!hb.coords) return null;
        const isActive =
          homebase?.placeId && hb.placeId
            ? homebase.placeId === hb.placeId
            : homebase?.coords.lat === hb.coords.lat &&
              homebase?.coords.lng === hb.coords.lng;
        if (isActive) return null; // active wird unten separat gerendert
        const key = hb.placeId ?? `${hb.coords.lat},${hb.coords.lng},${i}`;
        return (
          <AdvancedMarker
            key={`hb-inactive-${key}`}
            position={hb.coords}
            zIndex={500}
            title={`${hb.name}${
              hb.dateRange ? ` (${hb.dateRange.from} – ${hb.dateRange.to})` : ''
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/40 text-white opacity-70 ring-1 ring-white">
              <span className="text-xs">🏠</span>
            </div>
          </AdvancedMarker>
        );
      })}

      {homebase?.coords && (
        <AdvancedMarker
          position={homebase.coords}
          zIndex={999}
          onClick={() => setInternalSelectedId('__homebase__')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white shadow-lg ring-2 ring-white">
            <span className="text-lg">🏠</span>
          </div>
        </AdvancedMarker>
      )}

      {selectedId === '__homebase__' && homebase?.coords && (
        <InfoWindow
          position={homebase.coords}
          onCloseClick={() => setInternalSelectedId(null)}
          pixelOffset={[0, -44]}
          headerDisabled
        >
          <div
            className="-m-[1px] w-[240px] overflow-hidden rounded-xl font-sans text-ink"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <div
              className="relative flex h-28 w-full items-center justify-center overflow-hidden"
              style={
                homebase.image
                  ? undefined
                  : { background: 'linear-gradient(135deg, #3B2E2A 0%, #6B7A3F 100%)' }
              }
            >
              {homebase.image ? (
                <img
                  src={homebase.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl">🏠</span>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                🏠 Homebase
              </span>
            </div>
            <div className="space-y-1 p-3">
              <h3
                className="text-base leading-tight text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {homebase.name}
              </h3>
              {homebase.address && (
                <p className="text-xs text-ink/60">{homebase.address}</p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${homebase.coords.lat},${homebase.coords.lng}&travelmode=walking`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-full bg-olive/10 px-2.5 py-1 text-[11px] font-semibold text-olive hover:bg-olive/20"
                >
                  <Navigation className="h-3 w-3" />
                  Navigieren
                </a>
                {onStreetViewRequest && (
                  <button
                    type="button"
                    onClick={() => onStreetViewRequest(homebase.coords)}
                    className="flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-ink/10"
                  >
                    <Eye className="h-3 w-3" />
                    Street View
                  </button>
                )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}

      {selected && selectedId !== '__homebase__' && (
        <InfoWindow
          position={selected.coords}
          onCloseClick={() => setInternalSelectedId(null)}
          pixelOffset={[0, -44]}
          headerDisabled
        >
          {(() => {
            const selectedFamily = familyMap.get(selected.familyId);
            const familyColor = selectedFamily?.color ?? '#94999d';
            const hasImage = !!selected.image;
            return (
              <div
                className="-m-[1px] w-[240px] overflow-hidden rounded-xl font-sans text-ink"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <div
                  className="relative flex h-28 w-full items-center justify-center overflow-hidden"
                  style={
                    hasImage
                      ? undefined
                      : { background: CATEGORY_GRADIENT[selected.category] }
                  }
                >
                  {hasImage ? (
                    <img
                      src={selected.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">
                      {CATEGORY_EMOJI[selected.category]}
                    </span>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-ocker px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    {CATEGORY_EMOJI[selected.category]} {selected.category}
                  </span>
                  {selectedFamily && (
                    <span
                      className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
                      style={{ color: familyColor }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: familyColor }}
                      />
                      {selectedFamily.name}
                    </span>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <h3
                    className="text-base leading-tight text-ink"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {selected.title}
                  </h3>
                  {selected.address && (
                    <p className="text-xs text-ink/60">{selected.address}</p>
                  )}
                  {selected.rating !== undefined && (
                    <p className="flex items-center gap-1 text-xs text-ocker">
                      <span className="font-semibold">
                        ★ {selected.rating.toFixed(1)}
                      </span>
                      {selected.userRatingCount !== undefined && (
                        <span className="text-ink/40">
                          ({selected.userRatingCount})
                        </span>
                      )}
                    </p>
                  )}
                  {selected.openingHours && selected.openingHours.length > 0 && (() => {
                    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                    const today = dayNames[new Date().getDay()];
                    const todayLine = selected.openingHours.find((l: string) => l.startsWith(today));
                    if (!todayLine) return null;
                    const hours = todayLine.split(': ').slice(1).join(': ');
                    const closed = /closed|geschlossen/i.test(hours);
                    return (
                      <p className={`text-[10px] font-semibold ${closed ? 'text-terracotta' : 'text-olive'}`}>
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${closed ? 'bg-terracotta' : 'bg-olive'}`} />
                        {closed ? 'Heute geschlossen' : `Heute: ${hours}`}
                      </p>
                    );
                  })()}
                  {selected.description && (
                    <p className="line-clamp-2 text-xs text-ink/60">
                      {selected.description}
                    </p>
                  )}
                  {selected.aiSummary && (
                    <div className="rounded-lg bg-purple-50 px-2 py-1.5 text-[11px] text-ink/70">
                      <span className="mr-1 font-semibold text-purple-600">Was Gäste sagen</span>
                      <span className="line-clamp-3">{selected.aiSummary}</span>
                    </div>
                  )}
                  {(selected.mapsUrl || selected.instagramUrl) && (
                    <div className="flex gap-1 pt-1">
                      {selected.mapsUrl && (
                        <a
                          href={selected.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink hover:bg-ink/10"
                        >
                          Google Maps ↗
                        </a>
                      )}
                      {selected.instagramUrl && (
                        <a
                          href={selected.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink hover:bg-ink/10"
                        >
                          Instagram ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </InfoWindow>
      )}

      {mode === 'plan' && planPois.length >= 2 && (
        <RoutePolyline pois={planPois} homebase={homebase?.coords} onSummary={onRouteSummary} />
      )}
    </GMap>
  );
}
