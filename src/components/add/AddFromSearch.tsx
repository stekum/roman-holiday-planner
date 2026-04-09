import { useState } from 'react';
import { Star } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import {
  PlacesAutocomplete,
  type PlaceResult,
} from '../instagram/PlacesAutocomplete';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';

interface Props {
  families: Family[];
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

export function AddFromSearch({ families, onCancel, onSave }: Props) {
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Sonstiges',
    note: '',
  });

  const handleSave = () => {
    if (!place) return;
    const id = `poi-${Date.now().toString(36)}`;
    onSave({
      id,
      title: place.name,
      category: fields.category,
      familyId: fields.familyId,
      description: fields.note.trim() || place.address || '',
      coords: place.coords,
      image: place.photoUrl ?? '',
      likes: 0,
      placeId: place.placeId,
      address: place.address,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      mapsUrl: place.mapsUrl,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="space-y-4">
      <PlacesAutocomplete onSelect={setPlace} />

      {place && (
        <>
          {place.photoUrl && (
            <div className="overflow-hidden rounded-2xl bg-cream-dark">
              <img
                src={place.photoUrl}
                alt=""
                className="h-40 w-full object-cover"
              />
            </div>
          )}
          <div className="space-y-1 rounded-2xl bg-olive/10 p-3 text-sm text-olive-dark">
            <div className="font-semibold">{place.name}</div>
            {place.address && (
              <div className="text-xs">{place.address}</div>
            )}
            {place.rating !== undefined && (
              <div className="flex items-center gap-1 text-xs text-ocker">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">{place.rating.toFixed(1)}</span>
                {place.userRatingCount !== undefined && (
                  <span className="text-ink/50">
                    ({place.userRatingCount} Bewertungen)
                  </span>
                )}
              </div>
            )}
          </div>
          <AddPoiFields families={families} value={fields} onChange={setFields} />
        </>
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
          onClick={handleSave}
          disabled={!place || !fields.familyId}
          className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
