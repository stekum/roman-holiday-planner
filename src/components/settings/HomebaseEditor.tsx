import { useState } from 'react';
import { Home, ImagePlus, Trash2 } from 'lucide-react';
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
  // Photo auto-fetch is handled centrally by HomebasePhotoSync in App.tsx,
  // which runs at startup (not only when Settings tab is open).

  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  const handleSelect = (place: PlaceResult) => {
    setShowPhotoInput(false);
    setPhotoUrl('');
    onChange({
      name: place.name,
      address: place.address,
      coords: place.coords,
      placeId: place.placeId,
      image: place.photoUrl,
    });
  };

  const handlePhotoSave = () => {
    if (!homebase || !photoUrl.trim()) return;
    onChange({ ...homebase, image: photoUrl.trim() });
    setShowPhotoInput(false);
    setPhotoUrl('');
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
            <button
              type="button"
              onClick={() => {
                setShowPhotoInput((v) => !v);
                setPhotoUrl(homebase.image ?? '');
              }}
              className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl"
              title="Foto ändern"
            >
              {homebase.image ? (
                <img
                  src={homebase.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ink/10">
                  <Home className="h-7 w-7 text-ink/50" />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition group-hover:opacity-100">
                <ImagePlus className="h-5 w-5 text-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-base font-semibold text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {homebase.name}
              </p>
              <p className="truncate text-xs text-ink/60">{homebase.address}</p>
              {!homebase.image && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoInput((v) => !v);
                    setPhotoUrl('');
                  }}
                  className="mt-1 text-xs text-ocker hover:underline"
                >
                  + Foto-URL einfügen
                </button>
              )}
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

          {showPhotoInput && (
            <div className="flex gap-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://… Foto-URL einfügen"
                className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-cream px-3 py-2 text-xs text-ink outline-none focus:border-ocker"
              />
              <button
                type="button"
                onClick={handlePhotoSave}
                disabled={!photoUrl.trim()}
                className="rounded-xl bg-ocker px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoInput(false)}
                className="rounded-xl px-3 py-2 text-xs text-ink/50 hover:text-ink"
              >
                Abbrechen
              </button>
            </div>
          )}

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
            Setze euer Hotel oder Airbnb als Homebase. Sie wird als Start- und
            Endpunkt jeder Tagestour verwendet, und die Entfernung erscheint auf
            jeder POI-Card.
          </p>
          <PlacesAutocomplete onSelect={handleSelect} />
        </div>
      )}
    </section>
  );
}
