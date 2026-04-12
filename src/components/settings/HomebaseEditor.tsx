import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Home, Trash2 } from 'lucide-react';
import type { Homebase } from '../../settings/types';
import {
  PlacesAutocomplete,
  type PlaceResult,
} from '../instagram/PlacesAutocomplete';

interface Props {
  homebase?: Homebase;
  onChange: (hb: Homebase | undefined) => void;
}

export function HomebaseEditor({ homebase, onChange }: Props) {
  const placesLib = useMapsLibrary('places');
  const fetchedPlaceIdRef = useRef<string | null>(null);

  // Auto-fetch photo when homebase has a placeId but no image
  useEffect(() => {
    if (!placesLib || !homebase?.placeId || homebase.image) return;
    if (fetchedPlaceIdRef.current === homebase.placeId) return;
    fetchedPlaceIdRef.current = homebase.placeId;

    const service = new placesLib.PlacesService(document.createElement('div'));
    service.getDetails(
      { placeId: homebase.placeId, fields: ['photos'] },
      (place, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && place?.photos?.[0]) {
          try {
            const photoUrl = place.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 });
            if (photoUrl) onChange({ ...homebase, image: photoUrl });
          } catch {
            // ignore
          }
        }
      },
    );
  }, [placesLib, homebase, onChange]);

  const handleSelect = (place: PlaceResult) => {
    onChange({
      name: place.name,
      address: place.address,
      coords: place.coords,
      placeId: place.placeId,
      image: place.photoUrl,
    });
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <Home className="h-5 w-5 text-ink" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Homebase
        </h2>
      </div>

      {homebase ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-cream p-3">
            {homebase.image ? (
              <img
                src={homebase.image}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-ink/10">
                <Home className="h-7 w-7 text-ink/50" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-base font-semibold text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {homebase.name}
              </p>
              <p className="truncate text-xs text-ink/60">{homebase.address}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Homebase entfernen?')) onChange(undefined);
              }}
              className="flex-shrink-0 rounded-full p-2 text-ink/40 hover:bg-terracotta/10 hover:text-terracotta"
              aria-label="Homebase entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-ink/50">
            Dient als Start- und Endpunkt jeder Tagestour. Die Entfernung von
            der Homebase wird auf jeder POI-Card angezeigt.
          </p>
          <div className="pt-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink/60">
              Andere Homebase wählen
            </p>
            <PlacesAutocomplete onSelect={handleSelect} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            Setze euer Hotel oder Airbnb als Homebase. Sie wird als Startund
            Endpunkt jeder Tagestour verwendet, und die Entfernung erscheint auf
            jeder POI-Card.
          </p>
          <PlacesAutocomplete onSelect={handleSelect} />
        </div>
      )}
    </section>
  );
}
