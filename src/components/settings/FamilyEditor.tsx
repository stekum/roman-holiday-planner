import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import type { Family } from '../../settings/types';
import { FAMILY_COLOR_PALETTE } from '../../settings/defaults';

interface Props {
  families: Family[];
  onAdd: (family: Omit<Family, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<Family, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function FamilyEditor({ families, onAdd, onUpdate, onRemove }: Props) {
  const [openPaletteFor, setOpenPaletteFor] = useState<string | null>(null);

  const handleAdd = () => {
    const used = new Set(families.map((f) => f.color));
    const nextColor =
      FAMILY_COLOR_PALETTE.find((c) => !used.has(c.hex))?.hex ??
      FAMILY_COLOR_PALETTE[families.length % FAMILY_COLOR_PALETTE.length].hex;
    onAdd({ name: `Familie ${families.length + 1}`, color: nextColor });
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-olive" />
          <h2
            className="text-xl text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Familien
          </h2>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-full bg-olive px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-olive-dark"
        >
          <Plus className="h-4 w-4" />
          Neu
        </button>
      </div>

      <ul className="space-y-2">
        {families.map((family) => (
          <li
            key={family.id}
            className="flex items-center gap-3 rounded-2xl bg-cream p-2"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenPaletteFor((prev) => (prev === family.id ? null : family.id))
                }
                className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: family.color }}
                aria-label="Farbe wählen"
              />
              {openPaletteFor === family.id && (
                <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-2xl bg-white p-3 shadow-lg shadow-ink/10">
                  <div className="grid grid-cols-4 gap-2">
                    {FAMILY_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onUpdate(family.id, { color: c.hex });
                          setOpenPaletteFor(null);
                        }}
                        className="h-10 w-10 rounded-full border-2 border-white shadow-sm transition hover:scale-110"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={family.name}
              onChange={(e) => onUpdate(family.id, { name: e.target.value })}
              className="flex-1 rounded-xl bg-white px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-terracotta/30"
            />
            <button
              type="button"
              onClick={() => {
                if (families.length <= 1) return;
                if (confirm(`Familie „${family.name}" wirklich entfernen?`)) {
                  onRemove(family.id);
                }
              }}
              disabled={families.length <= 1}
              className="rounded-full p-2 text-ink/40 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-30"
              aria-label="Entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {families.length <= 1 && (
        <p className="mt-2 text-xs text-ink/50">
          Mindestens eine Familie muss bleiben.
        </p>
      )}
    </section>
  );
}
