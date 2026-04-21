import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Sparkles } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { POI } from '../../data/pois';
import type { Family, TripConfig } from '../../settings/types';
import {
  fetchIgMetadata,
  isInstagramUrl,
  type IgMetadata,
} from '../../lib/igMetadata';
import {
  PlacesAutocomplete,
  type PlaceResult,
} from '../instagram/PlacesAutocomplete';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';
import { extractLocationsFromCaption } from '../../lib/aiInstagramLocationExtractor';
import { DEFAULT_TRIP_CONFIG } from '../../settings/tripConfig';
import { isGeminiConfigured } from '../../lib/gemini';
import { mapPriceLevel } from '../../lib/placesNewApi';

interface Props {
  families: Family[];
  tripConfig?: TripConfig;
  homebaseCoords?: { lat: number; lng: number };
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; candidates: PlaceResult[]; extractedNames: string[] }
  | { status: 'error'; message: string };

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; meta: IgMetadata }
  | { status: 'error'; message: string };

export function AddFromInstagram({ families, tripConfig, homebaseCoords, onCancel, onSave }: Props) {
  const placesLib = useMapsLibrary('places');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [aiState, setAiState] = useState<AiState>({ status: 'idle' });
  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Instagram',
    note: '',
  });

  const urlValid = url.trim().length > 0;
  const isIg = urlValid && isInstagramUrl(url.trim());

  const handleFetchMeta = async () => {
    if (!isIg) return;
    setFetchState({ status: 'loading' });
    setAiState({ status: 'idle' });
    const result = await fetchIgMetadata(url.trim());
    if (result.ok && result.meta) {
      setFetchState({ status: 'success', meta: result.meta });
      if (result.meta.image && !imageUrl) setImageUrl(result.meta.image);
      if (result.meta.title && !title) setTitle(result.meta.title);
      if (result.meta.description && !description)
        setDescription(result.meta.description);

      // #16: AI-Extraktion + Places-Search (nur wenn Gemini konfiguriert + Maps geladen)
      if (isGeminiConfigured && placesLib) {
        void runAiExtraction(result.meta);
      }
    } else {
      setFetchState({
        status: 'error',
        message: result.error ?? 'Unbekannter Fehler.',
      });
    }
  };

  const runAiExtraction = async (meta: IgMetadata) => {
    if (!placesLib) return;
    setAiState({ status: 'loading' });
    try {
      const effectiveConfig = tripConfig ?? DEFAULT_TRIP_CONFIG;
      const names = await extractLocationsFromCaption({
        caption: meta.description ?? '',
        title: meta.title ?? '',
        tripConfig: effectiveConfig,
      });

      if (names.length === 0) {
        setAiState({ status: 'done', candidates: [], extractedNames: [] });
        return;
      }

      // #181: Places API (New) — Place.searchByText statt Legacy PlacesService
      const bias = homebaseCoords;
      const candidates: PlaceResult[] = [];

      for (const name of names) {
        const query = `${name}, ${effectiveConfig.city}`;
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'rating',
              'userRatingCount',
              'priceLevel',
              'photos',
            ],
            maxResultCount: 1,
            ...(bias
              ? { locationBias: { center: bias, radius: 30000 } }
              : {}),
          });
          const top = places?.[0];
          if (top?.location && top.id) {
            candidates.push({
              name: top.displayName ?? name,
              address: top.formattedAddress ?? '',
              coords: { lat: top.location.lat(), lng: top.location.lng() },
              placeId: top.id,
              photoUrl: top.photos?.[0]?.getURI({ maxWidth: 400, maxHeight: 300 }),
              rating: top.rating ?? undefined,
              userRatingCount: top.userRatingCount ?? undefined,
              mapsUrl: `https://www.google.com/maps/place/?q=place_id:${top.id}`,
              priceLevel: mapPriceLevel(top.priceLevel),
            });
          }
        } catch (err) {
          console.warn(`[AddFromInstagram] searchByText "${query}" failed`, err);
        }
      }

      setAiState({ status: 'done', candidates, extractedNames: names });
    } catch (err) {
      setAiState({
        status: 'error',
        message: err instanceof Error ? err.message : 'AI-Extraktion fehlgeschlagen.',
      });
    }
  };

  const handleSave = () => {
    if (!urlValid || !fields.familyId) return;
    const id = `ig-${Date.now().toString(36)}`;
    const effectiveTitle = title.trim() || place?.name || '';
    if (!effectiveTitle) return;
    const coords = place?.coords;
    onSave({
      id,
      title: effectiveTitle,
      category: fields.category,
      familyId: fields.familyId,
      description:
        fields.note.trim() ||
        description.trim() ||
        place?.address ||
        '',
      coords,
      image: imageUrl.trim() || place?.photoUrl || '',
      likes: 0,
      instagramUrl: url.trim(),
      placeId: place?.placeId,
      address: place?.address,
      rating: place?.rating,
      userRatingCount: place?.userRatingCount,
      mapsUrl: place?.mapsUrl,
      needsLocation: !coords,
      createdAt: Date.now(),
    });
  };

  const canSave = urlValid && !!fields.familyId && !!(title.trim() || place?.name);

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Instagram-Link
        </span>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setFetchState({ status: 'idle' });
            }}
            placeholder="https://www.instagram.com/p/…"
            className="flex-1 rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
          <button
            type="button"
            onClick={handleFetchMeta}
            disabled={!isIg || fetchState.status === 'loading'}
            className="flex items-center gap-1 rounded-2xl bg-terracotta px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {fetchState.status === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Holen
          </button>
        </div>
        {urlValid && !isIg && (
          <p className="mt-1 text-xs text-terracotta">
            Das sieht nicht nach einem Instagram-Link aus.
          </p>
        )}
      </div>

      {fetchState.status === 'success' && (
        <div className="flex items-start gap-2 rounded-2xl bg-olive/10 p-3 text-xs text-olive-dark">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-olive" />
          <div>
            <strong>Metadaten übernommen</strong> — du kannst Titel, Bild und
            Notiz unten noch anpassen. Instagram liefert keine Koordinaten,
            deshalb bitte unten optional einen Ort wählen.
          </div>
        </div>
      )}
      {fetchState.status === 'error' && (
        <div className="flex items-start gap-2 rounded-2xl bg-terracotta/10 p-3 text-xs text-terracotta">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <strong>Metadaten-Fetch fehlgeschlagen.</strong>{' '}
            <span className="text-ink/60">{fetchState.message}</span>
            <p className="mt-1 text-ink/60">
              Du kannst Titel, Bild-URL und Notiz unten trotzdem manuell
              eintragen. Der Instagram-Link wird gespeichert und ist auf der
              Karte klickbar.
            </p>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="overflow-hidden rounded-2xl bg-cream-dark">
          <img
            src={imageUrl}
            alt=""
            className="h-48 w-full object-cover"
            onError={() => setImageUrl('')}
          />
        </div>
      )}

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Titel
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wie soll der Ort heißen?"
          className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Bild-URL (optional)
        </span>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Beschreibung
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Was steht im Post / Reel?"
          className="w-full resize-none rounded-2xl border border-cream-dark bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Ort (optional — sonst landet der Eintrag in der Inbox)
        </span>

        {aiState.status === 'loading' && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl bg-terracotta/10 px-3 py-2 text-xs text-terracotta">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI analysiert Caption + sucht passende Orte…</span>
          </div>
        )}

        {aiState.status === 'done' && aiState.candidates.length > 0 && !place && (
          <div className="mb-2 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-terracotta">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Vorschläge aus der Caption</span>
            </div>
            {aiState.candidates.map((candidate) => (
              <button
                key={candidate.placeId}
                type="button"
                onClick={() => setPlace(candidate)}
                className="flex w-full items-start gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm transition hover:bg-cream"
              >
                {candidate.photoUrl ? (
                  <img
                    src={candidate.photoUrl}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cream-dark">
                    <MapPin className="h-5 w-5 text-ink/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {candidate.name}
                  </div>
                  <div className="truncate text-xs text-ink/60">{candidate.address}</div>
                  {candidate.rating !== undefined && (
                    <div className="text-[11px] text-ink/50">
                      ⭐ {candidate.rating.toFixed(1)}
                      {candidate.userRatingCount ? ` (${candidate.userRatingCount})` : ''}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {aiState.status === 'done' && aiState.candidates.length === 0 && aiState.extractedNames.length === 0 && (
          <div className="mb-2 rounded-2xl bg-cream-dark px-3 py-2 text-xs text-ink/60">
            Keine Orte in der Caption erkannt. Bitte unten manuell suchen.
          </div>
        )}

        {aiState.status === 'done' && aiState.candidates.length === 0 && aiState.extractedNames.length > 0 && (
          <div className="mb-2 rounded-2xl bg-cream-dark px-3 py-2 text-xs text-ink/60">
            Aus der Caption extrahiert: <strong>{aiState.extractedNames.join(', ')}</strong>. Places-Suche brachte aber keine Treffer — bitte unten manuell suchen.
          </div>
        )}

        <PlacesAutocomplete onSelect={setPlace} />
        {place && (
          <div className="mt-2 rounded-2xl bg-olive/10 px-3 py-2 text-sm text-olive-dark">
            <strong>{place.name}</strong>
            <br />
            <span className="text-xs">{place.address}</span>
          </div>
        )}
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
          disabled={!canSave}
          className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          {place ? 'Hinzufügen' : 'Zur Inbox'}
        </button>
      </div>
    </div>
  );
}
