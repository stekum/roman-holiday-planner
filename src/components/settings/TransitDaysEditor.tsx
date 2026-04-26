import { useState } from 'react';
import { ArrowRight, Plus, Train, Trash2 } from 'lucide-react';
import type { Homebase, TransitDay } from '../../settings/types';

interface Props {
  transitDays: TransitDay[];
  homebases: Homebase[];
  /** Trip-Range, um Date-Picker zu begrenzen. */
  tripStart?: string;
  tripEnd?: string;
  onChange: (list: TransitDay[]) => void;
}

const DEFAULT_DRAFT: TransitDay = {
  date: '',
  fromCity: '',
  toCity: '',
  mode: '',
  departure: '',
  arrival: '',
  info: '',
};

/**
 * #78 Transit-Tage-Editor — Reisetage zwischen Städten ohne POI-Programm.
 * Reihenfolge in der Liste = chronologisch (sortiert beim Render).
 *
 * Stadt-Auswahl pickt aus den existing Homebases per Datalist (Browser-
 * Autocomplete), Free-Text bleibt erlaubt damit du auch "Tokyo HND" oder
 * Zwischenstationen eintragen kannst.
 */
export function TransitDaysEditor({
  transitDays,
  homebases,
  tripStart,
  tripEnd,
  onChange,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<TransitDay>(DEFAULT_DRAFT);

  const cityOptions = Array.from(new Set(homebases.map((h) => h.name).filter(Boolean)));

  const sorted = [...transitDays].sort((a, b) => a.date.localeCompare(b.date));

  function commitDraft() {
    const cleaned: TransitDay = {
      date: draft.date.trim(),
      fromCity: draft.fromCity.trim(),
      toCity: draft.toCity.trim(),
      mode: draft.mode.trim(),
      departure: draft.departure?.trim() || undefined,
      arrival: draft.arrival?.trim() || undefined,
      info: draft.info?.trim() || undefined,
    };
    if (!cleaned.date || !cleaned.fromCity || !cleaned.toCity || !cleaned.mode) return;
    // De-dupe: ein Transit-Tag pro Datum — überschreibt existing
    const next = [...transitDays.filter((t) => t.date !== cleaned.date), cleaned];
    onChange(next);
    setDraft(DEFAULT_DRAFT);
    setAdding(false);
  }

  function updateAt(idx: number, patch: Partial<TransitDay>) {
    const next = sorted.map((t, i) =>
      i === idx
        ? {
            ...t,
            ...patch,
            departure: patch.departure?.trim() === '' ? undefined : patch.departure ?? t.departure,
            arrival: patch.arrival?.trim() === '' ? undefined : patch.arrival ?? t.arrival,
            info: patch.info?.trim() === '' ? undefined : patch.info ?? t.info,
          }
        : t,
    );
    onChange(next);
  }

  function removeAt(idx: number) {
    const next = sorted.filter((_, i) => i !== idx);
    onChange(next);
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Train className="h-5 w-5 text-olive" />
        <h2 className="text-lg font-semibold text-olive-dark">Transit-Tage</h2>
        <span className="ml-auto text-xs text-ink/40">{transitDays.length}</span>
      </div>
      <p className="mb-3 text-xs text-ink/50">
        Reisetage zwischen Städten — Shinkansen, Flug, Auto. Ersetzt das Tagesprogramm im
        Reise-Tab durch eine Transit-Karte (kein POI-Routing).
      </p>

      <datalist id="transit-cities">
        {cityOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {sorted.length > 0 && (
        <ul className="mb-3 space-y-2">
          {sorted.map((t, idx) => (
            <li
              key={`${t.date}-${idx}`}
              className="rounded-2xl border border-cream-dark bg-cream/40 p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  type="date"
                  value={t.date}
                  min={tripStart}
                  max={tripEnd}
                  onChange={(e) => updateAt(idx, { date: e.target.value })}
                  className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs text-ink"
                  aria-label="Datum"
                />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="ml-auto rounded-lg p-1.5 text-ink/30 hover:bg-terracotta/10 hover:text-terracotta"
                  aria-label="Transit-Tag entfernen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  list="transit-cities"
                  value={t.fromCity}
                  onChange={(e) => updateAt(idx, { fromCity: e.target.value })}
                  placeholder="Von Stadt"
                  className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                />
                <input
                  type="text"
                  list="transit-cities"
                  value={t.toCity}
                  onChange={(e) => updateAt(idx, { toCity: e.target.value })}
                  placeholder="Nach Stadt"
                  className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                />
                <input
                  type="text"
                  value={t.mode}
                  onChange={(e) => updateAt(idx, { mode: e.target.value })}
                  placeholder="z.B. Shinkansen"
                  className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={t.departure ?? ''}
                    onChange={(e) => updateAt(idx, { departure: e.target.value })}
                    className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                    aria-label="Abfahrt"
                  />
                  <input
                    type="time"
                    value={t.arrival ?? ''}
                    onChange={(e) => updateAt(idx, { arrival: e.target.value })}
                    className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                    aria-label="Ankunft"
                  />
                </div>
                <input
                  type="text"
                  value={t.info ?? ''}
                  onChange={(e) => updateAt(idx, { info: e.target.value })}
                  placeholder="Sitz/Gleis/Buchung (optional)"
                  className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink sm:col-span-2"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-2xl border-2 border-dashed border-olive/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={draft.date}
              min={tripStart}
              max={tripEnd}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              placeholder="Datum"
              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink sm:col-span-2"
              aria-label="Datum"
            />
            <input
              type="text"
              list="transit-cities"
              value={draft.fromCity}
              onChange={(e) => setDraft({ ...draft, fromCity: e.target.value })}
              placeholder="Von Stadt"
              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
            />
            <input
              type="text"
              list="transit-cities"
              value={draft.toCity}
              onChange={(e) => setDraft({ ...draft, toCity: e.target.value })}
              placeholder="Nach Stadt"
              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
            />
            <input
              type="text"
              value={draft.mode}
              onChange={(e) => setDraft({ ...draft, mode: e.target.value })}
              placeholder="z.B. Shinkansen"
              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={draft.departure ?? ''}
                onChange={(e) => setDraft({ ...draft, departure: e.target.value })}
                className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                aria-label="Abfahrt"
              />
              <input
                type="time"
                value={draft.arrival ?? ''}
                onChange={(e) => setDraft({ ...draft, arrival: e.target.value })}
                className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink"
                aria-label="Ankunft"
              />
            </div>
            <input
              type="text"
              value={draft.info ?? ''}
              onChange={(e) => setDraft({ ...draft, info: e.target.value })}
              placeholder="Sitz/Gleis/Buchung (optional)"
              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-sm text-ink sm:col-span-2"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={commitDraft}
              disabled={!draft.date || !draft.fromCity || !draft.toCity || !draft.mode}
              className="flex items-center gap-1 rounded-2xl bg-olive px-3 py-1.5 text-sm font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4" />
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_DRAFT);
                setAdding(false);
              }}
              className="rounded-2xl bg-ink/5 px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/10"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-olive/40 px-3 py-2 text-sm text-ink/70 hover:border-olive hover:text-olive-dark"
        >
          <Plus className="h-4 w-4" />
          Transit-Tag hinzufügen
        </button>
      )}
    </section>
  );
}
