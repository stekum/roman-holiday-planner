import { useState } from 'react';
import { Calendar, Home, ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { Homebase } from '../../settings/types';
import type { PlacesBias } from '../../lib/placesBias';
import {
  PlacesAutocomplete,
  type PlaceResult,
} from '../instagram/PlacesAutocomplete';

interface Props {
  homebases: Homebase[];
  onChange: (list: Homebase[]) => void;
  /** Trip-Range, um Date-Picker-Hinweise zu zeigen. */
  tripStart?: string;
  tripEnd?: string;
  /** Places-Bias (aus aktiver Trip-Config abgeleitet). */
  bias?: PlacesBias;
}

/**
 * Multi-Homebase-Editor (#74). Löst den alten `HomebaseEditor` (singular)
 * ab. Jede Homebase kann einen optionalen Datums-Range bekommen — die
 * App wählt automatisch die für den aktiven Tag passende (siehe
 * `getHomebaseForDay`).
 *
 * Scope-Lock:
 *  - Kein Drag-to-Reorder (Liste ist linear, Reihenfolge = Prio bei
 *    überlappenden Ranges)
 *  - Überlappende Date-Ranges werden akzeptiert, erste Homebase gewinnt
 *    → UI warnt nicht, weil das Feature in seltenen Übergabe-Cases
 *    sogar nützlich sein kann
 */
export function HomebasesEditor({
  homebases,
  onChange,
  tripStart,
  tripEnd,
  bias,
}: Props) {
  const [adding, setAdding] = useState(false);

  const handlePickNew = (place: PlaceResult) => {
    const next: Homebase = {
      name: place.name,
      address: place.address,
      coords: place.coords,
      placeId: place.placeId,
      image: place.photoUrl,
    };
    onChange([...homebases, next]);
    setAdding(false);
  };

  const updateAt = (idx: number, patch: Partial<Homebase>) => {
    const next = homebases.map((hb, i) => (i === idx ? { ...hb, ...patch } : hb));
    onChange(next);
  };

  const setDateRange = (idx: number, from: string, to: string) => {
    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();
    if (!trimmedFrom && !trimmedTo) {
      // Beide leer → dateRange entfernen
      const { dateRange: _, ...rest } = homebases[idx];
      void _;
      const next = homebases.map((hb, i) => (i === idx ? rest : hb));
      onChange(next);
      return;
    }
    updateAt(idx, {
      dateRange: { from: trimmedFrom, to: trimmedTo || trimmedFrom },
    });
  };

  const removeAt = (idx: number) => {
    if (!confirm('Homebase entfernen?')) return;
    onChange(homebases.filter((_, i) => i !== idx));
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <Home className="h-5 w-5 text-ink" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Homebases
        </h2>
      </div>

      {homebases.length === 0 && !adding && (
        <p className="mb-4 text-sm text-ink/60">
          Setze eure Unterkunft als Homebase. Wird als Start- und Endpunkt
          jeder Tagestour verwendet, und die Entfernung erscheint auf jeder
          POI-Karte. Bei Multi-City-Trips (z.B. Tokyo → Kyoto → Osaka) mehrere
          Einträge mit Datums-Range anlegen — die App wählt automatisch die
          für den aktiven Tag passende.
        </p>
      )}

      <ul className="space-y-3">
        {homebases.map((hb, idx) => (
          <li key={`${hb.placeId ?? hb.name}-${idx}`} className="rounded-2xl bg-cream p-3">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                {hb.image ? (
                  <img src={hb.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ink/10">
                    <Home className="h-7 w-7 text-ink/50" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-base font-semibold text-ink"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {hb.name}
                </p>
                <p className="truncate text-xs text-ink/60">{hb.address}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="flex-shrink-0 rounded-full p-2 text-ink/40 hover:bg-terracotta/10 hover:text-terracotta"
                aria-label="Homebase entfernen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  <Calendar className="h-3 w-3" /> Von
                </span>
                <input
                  type="date"
                  value={hb.dateRange?.from ?? ''}
                  min={tripStart}
                  max={tripEnd}
                  onChange={(e) =>
                    setDateRange(idx, e.target.value, hb.dateRange?.to ?? '')
                  }
                  className="w-full rounded-xl border border-ink/10 bg-white px-2 py-1.5 text-xs text-ink focus:border-olive focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  <Calendar className="h-3 w-3" /> Bis
                </span>
                <input
                  type="date"
                  value={hb.dateRange?.to ?? ''}
                  min={hb.dateRange?.from ?? tripStart}
                  max={tripEnd}
                  onChange={(e) =>
                    setDateRange(idx, hb.dateRange?.from ?? '', e.target.value)
                  }
                  className="w-full rounded-xl border border-ink/10 bg-white px-2 py-1.5 text-xs text-ink focus:border-olive focus:outline-none"
                />
              </label>
            </div>
            {!hb.dateRange && (
              <p className="mt-1 text-[11px] text-ink/40">
                Ohne Datum: gilt für den gesamten Trip (catch-all).
              </p>
            )}
            {!hb.image && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ocker">
                <ImagePlus className="h-3 w-3" /> Foto fehlt — wird bei nächstem
                Öffnen automatisch von Places geladen.
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-cream-dark pt-4">
        {adding ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/60">
              Neue Homebase suchen
            </p>
            <PlacesAutocomplete onSelect={handlePickNew} bias={bias} />
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mt-2 text-xs text-ink/50 hover:text-ink"
            >
              Abbrechen
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/5 px-4 py-3 text-sm font-semibold text-ink/70 transition hover:bg-ink/10 hover:text-ink"
          >
            <Plus className="h-4 w-4" />
            Homebase hinzufügen
          </button>
        )}
      </div>
    </section>
  );
}
