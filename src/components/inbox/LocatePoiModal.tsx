import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { PlacesBias } from '../../lib/placesBias';
import {
  PlacesAutocomplete,
  type PlaceResult,
} from '../instagram/PlacesAutocomplete';

interface Props {
  poi: POI;
  onCancel: () => void;
  onSave: (coords: { lat: number; lng: number }, placeId?: string) => void;
  /** Stadt-Name fuer UI-Text. */
  city?: string;
  /** Bias fuer Places-Suche. */
  bias?: PlacesBias;
}

export function LocatePoiModal({ poi, onCancel, onSave, city, bias }: Props) {
  const [place, setPlace] = useState<PlaceResult | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-terracotta/10 p-2 text-terracotta">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2
                className="text-lg text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                „{poi.title}" verorten
              </h2>
              <p className="text-xs text-ink/60">
                Ort {city ? `in ${city}` : ''} suchen und auswählen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-ink/50 hover:bg-cream hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <PlacesAutocomplete onSelect={setPlace} bias={bias} />

          {place && (
            <div className="rounded-2xl bg-olive/10 p-3 text-sm text-olive-dark">
              <strong>{place.name}</strong>
              <br />
              <span className="text-xs">{place.address}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl bg-cream px-4 py-3 font-semibold text-ink/70 hover:bg-cream-dark"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() =>
                place && onSave(place.coords, place.placeId)
              }
              disabled={!place}
              className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
            >
              Ort speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
