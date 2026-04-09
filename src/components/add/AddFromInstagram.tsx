import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
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

interface Props {
  families: Family[];
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; meta: IgMetadata }
  | { status: 'error'; message: string };

export function AddFromInstagram({ families, onCancel, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const [place, setPlace] = useState<PlaceResult | null>(null);
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
    const result = await fetchIgMetadata(url.trim());
    if (result.ok && result.meta) {
      setFetchState({ status: 'success', meta: result.meta });
      if (result.meta.image && !imageUrl) setImageUrl(result.meta.image);
      if (result.meta.title && !title) setTitle(result.meta.title);
      if (result.meta.description && !description)
        setDescription(result.meta.description);
    } else {
      setFetchState({
        status: 'error',
        message: result.error ?? 'Unbekannter Fehler.',
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
