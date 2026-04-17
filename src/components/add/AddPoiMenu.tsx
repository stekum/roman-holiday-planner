import { useEffect, useState } from 'react';
import { Camera, MapPin, Pencil, Plus, Search, Sparkles, X } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import { AddFromSearch } from './AddFromSearch';
import { AddFromAiSearch } from './AddFromAiSearch';
import { AddFromMap } from './AddFromMap';
import { AddManual } from './AddManual';
import { AddFromInstagram } from './AddFromInstagram';

export type AddMode = null | 'menu' | 'search' | 'ai-search' | 'map' | 'manual' | 'instagram';

interface Props {
  families: Family[];
  /** If currently in 'map' mode and a coord comes in from RomeMap click. */
  pickedMapCoords: { lat: number; lng: number } | null;
  /** Optional placeId if the user clicked on a Google POI on the map. */
  pickedMapPlaceId: string | null;
  onAdd: (poi: POI) => void;
  /** current mode, controlled by parent so RomeMap can react to 'map' sub-mode. */
  mode: AddMode;
  setMode: (m: AddMode) => void;
  /** Called when map sub-mode is entered/exited — parent uses this to clear pickedCoords. */
  onClearPicked: () => void;
}

const TILES: {
  id: Exclude<AddMode, null | 'menu'>;
  label: string;
  desc: string;
  Icon: typeof Search;
}[] = [
  {
    id: 'search',
    label: 'Suchen',
    desc: 'Google-Places-Suche',
    Icon: Search,
  },
  {
    id: 'ai-search',
    label: 'Vibes-Suche',
    desc: 'Mit KI beschreiben',
    Icon: Sparkles,
  },
  {
    id: 'map',
    label: 'Auf Karte',
    desc: 'Tippen um Pin zu setzen',
    Icon: MapPin,
  },
  {
    id: 'manual',
    label: 'Manuell',
    desc: 'Name + Notiz, später verorten',
    Icon: Pencil,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    desc: 'Link einfügen',
    Icon: Camera,
  },
];

export function AddPoiMenu({
  families,
  pickedMapCoords,
  pickedMapPlaceId,
  onAdd,
  mode,
  setMode,
  onClearPicked,
}: Props) {
  const open = mode !== null;
  const showSheet = mode === 'menu' || mode === 'search' || mode === 'ai-search' || mode === 'manual' || mode === 'instagram' || (mode === 'map' && pickedMapCoords !== null);
  const [hint, setHint] = useState(false);

  // Show hint banner when in map-pick mode with sheet hidden
  useEffect(() => {
    setHint(mode === 'map' && !pickedMapCoords);
  }, [mode, pickedMapCoords]);

  const close = () => {
    setMode(null);
    onClearPicked();
  };

  const handleSave = (poi: POI) => {
    onAdd(poi);
    close();
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setMode('menu')}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-xl shadow-terracotta/40 transition hover:scale-105 hover:bg-terracotta-dark"
        aria-label="Ort hinzufügen"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Map-pick hint banner */}
      {hint && (
        <div className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-lg">
          Tippe auf die Karte
          <button
            type="button"
            onClick={close}
            className="ml-3 rounded-full bg-cream/20 px-2 py-0.5 text-xs"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      {open && showSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-xl text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {mode === 'menu' && 'Ort hinzufügen'}
                {mode === 'search' && 'Ort suchen'}
                {mode === 'ai-search' && 'Vibes-Suche'}
                {mode === 'map' && 'Auf Karte gesetzt'}
                {mode === 'manual' && 'Manueller Eintrag'}
                {mode === 'instagram' && 'Instagram-Import'}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-ink/50 hover:bg-cream hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === 'menu' && (
              <div className="grid grid-cols-2 gap-3">
                {TILES.map(({ id, label, desc, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className="flex flex-col items-start gap-2 rounded-2xl bg-cream p-4 text-left transition hover:bg-cream-dark"
                  >
                    <div className="rounded-full bg-terracotta/10 p-2 text-terracotta">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{label}</div>
                      <div className="text-xs text-ink/60">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mode === 'search' && (
              <AddFromSearch
                families={families}
                onCancel={close}
                onSave={handleSave}
              />
            )}
            {mode === 'ai-search' && (
              <AddFromAiSearch
                families={families}
                onCancel={close}
                onSave={handleSave}
              />
            )}
            {mode === 'map' && pickedMapCoords && (
              <AddFromMap
                families={families}
                pickedCoords={pickedMapCoords}
                pickedPlaceId={pickedMapPlaceId}
                onCancel={close}
                onSave={handleSave}
              />
            )}
            {mode === 'manual' && (
              <AddManual
                families={families}
                onCancel={close}
                onSave={handleSave}
              />
            )}
            {mode === 'instagram' && (
              <AddFromInstagram
                families={families}
                onCancel={close}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
