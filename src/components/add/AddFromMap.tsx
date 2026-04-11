import { useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Star } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';

interface Props {
  families: Family[];
  /** Coordinates coming in from a map click on the parent. Null while waiting. */
  pickedCoords: { lat: number; lng: number } | null;
  /** Optional placeId if the user clicked on a Google POI (restaurant, sight, ...). */
  pickedPlaceId: string | null;
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

interface EnrichedPlace {
  name?: string;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  photoUrl?: string;
  mapsUrl?: string;
  placeId?: string;
  openingHours?: string[];
}

export function AddFromMap({
  families,
  pickedCoords,
  pickedPlaceId,
  onCancel,
  onSave,
}: Props) {
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  const [enriched, setEnriched] = useState<EnrichedPlace>({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Sonstiges',
    note: '',
  });

  // Reset when pickedCoords change (new click)
  useEffect(() => {
    if (pickedCoords) {
      setEnriched({});
      setTitle('');
    }
  }, [pickedCoords]);

  // Fetch place details if placeId is known (user clicked a Google POI)
  useEffect(() => {
    if (!pickedPlaceId || !placesLib) return;
    setLoading(true);
    const service = new placesLib.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId: pickedPlaceId,
        fields: [
          'name',
          'formatted_address',
          'rating',
          'user_ratings_total',
          'photos',
          'url',
          'place_id',
          'types',
          'opening_hours',
        ],
      },
      (place, status) => {
        setLoading(false);
        if (status !== placesLib.PlacesServiceStatus.OK || !place) return;
        const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 });
        setEnriched({
          name: place.name,
          address: place.formatted_address,
          rating: place.rating,
          userRatingCount: place.user_ratings_total,
          photoUrl,
          mapsUrl: place.url,
          placeId: place.place_id,
          openingHours: place.opening_hours?.weekday_text,
        });
        if (place.name) setTitle(place.name);
      },
    );
  }, [pickedPlaceId, placesLib]);

  // Fallback reverse-geocoding only when clicking blank area (no placeId)
  useEffect(() => {
    if (pickedPlaceId || !pickedCoords || !geocodingLib) return;
    const geocoder = new geocodingLib.Geocoder();
    geocoder
      .geocode({ location: pickedCoords })
      .then((res) => {
        const first = res.results?.[0];
        if (!first) return;
        setEnriched((prev) => ({ ...prev, address: first.formatted_address }));
        if (!title) {
          const comp =
            first.address_components.find((c) =>
              ['premise', 'point_of_interest', 'establishment'].some((t) =>
                c.types.includes(t),
              ),
            )?.long_name ??
            first.address_components.find((c) => c.types.includes('route'))?.long_name ??
            first.formatted_address.split(',')[0];
          setTitle(comp);
        }
      })
      .catch(() => {
        // silently ignore — user can still type
      });
  }, [pickedPlaceId, pickedCoords, geocodingLib, title]);

  const handleSave = () => {
    if (!pickedCoords || !title.trim() || !fields.familyId) return;
    const id = `poi-${Date.now().toString(36)}`;
    onSave({
      id,
      title: title.trim(),
      category: fields.category,
      familyId: fields.familyId,
      description: fields.note.trim() || enriched.address || '',
      coords: pickedCoords,
      image: enriched.photoUrl ?? '',
      likes: 0,
      address: enriched.address,
      rating: enriched.rating,
      userRatingCount: enriched.userRatingCount,
      mapsUrl: enriched.mapsUrl,
      openingHours: enriched.openingHours,
      placeId: enriched.placeId ?? pickedPlaceId ?? undefined,
      createdAt: Date.now(),
    });
  };

  if (!pickedCoords) {
    return (
      <div className="space-y-3 py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
          <MapPin className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-ink">
          Tippe auf die Karte, um einen Ort zu setzen.
        </p>
        <p className="text-sm text-ink/60">
          Tipp auf ein Restaurant, Café oder eine Sehenswürdigkeit, um Daten
          direkt aus Google zu übernehmen. Auf leere Stellen tippen setzt einen
          Pin mit Adressvorschlag.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 rounded-2xl bg-cream px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-cream-dark"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enriched.photoUrl && (
        <div className="overflow-hidden rounded-2xl bg-cream-dark">
          <img
            src={enriched.photoUrl}
            alt=""
            className="h-40 w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-1 rounded-2xl bg-olive/10 p-3 text-sm text-olive-dark">
        {loading && <div className="text-xs">Lade Google-Place-Daten…</div>}
        {enriched.name && <div className="font-semibold">{enriched.name}</div>}
        {enriched.address && <div className="text-xs">{enriched.address}</div>}
        {enriched.rating !== undefined && (
          <div className="flex items-center gap-1 text-xs text-ocker">
            <Star className="h-3 w-3 fill-current" />
            <span className="font-semibold">{enriched.rating.toFixed(1)}</span>
            {enriched.userRatingCount !== undefined && (
              <span className="text-ink/50">
                ({enriched.userRatingCount} Bewertungen)
              </span>
            )}
          </div>
        )}
        {!enriched.name && !loading && (
          <div className="text-xs">
            {pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}
          </div>
        )}
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Name
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name des Ortes"
          className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>

      <AddPoiFields families={families} value={fields} onChange={setFields} />

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
          disabled={!title.trim() || !fields.familyId}
          className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
