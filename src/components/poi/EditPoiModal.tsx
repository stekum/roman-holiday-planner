import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Category, POI } from '../../data/pois';
import { CATEGORIES, CATEGORY_EMOJI } from '../../data/pois';
import type { Family } from '../../settings/types';

interface Props {
  poi: POI;
  families: Family[];
  onCancel: () => void;
  onSave: (patch: Partial<POI>) => void;
}

export function EditPoiModal({ poi, families, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(poi.title);
  const [familyId, setFamilyId] = useState(poi.familyId);
  const [category, setCategory] = useState<Category>(poi.category);
  const [description, setDescription] = useState(poi.description);
  const [image, setImage] = useState(poi.image);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      familyId,
      category,
      description: description.trim(),
      image: image.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onClick={onCancel}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-ocker/15 p-2 text-ocker">
              <Pencil className="h-5 w-5" />
            </div>
            <h2
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ort bearbeiten
            </h2>
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
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Name
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Familie
            </span>
            <div className="flex flex-wrap gap-2">
              {families.map((f) => {
                const active = f.id === familyId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFamilyId(f.id)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      active
                        ? 'text-white shadow-md'
                        : 'bg-cream text-ink/70 hover:bg-cream-dark'
                    }`}
                    style={active ? { backgroundColor: f.color } : undefined}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        active ? 'bg-white/80' : ''
                      }`}
                      style={active ? undefined : { backgroundColor: f.color }}
                    />
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Kategorie
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-ocker text-white shadow-md'
                        : 'bg-cream text-ink/70 hover:bg-cream-dark'
                    }`}
                  >
                    {CATEGORY_EMOJI[c]} {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Notiz
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-cream-dark bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta focus:bg-white"
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Bild-URL (optional)
            </span>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Leer lassen für Gradient-Placeholder"
              className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
            />
          </div>

          {poi.address && (
            <div className="rounded-2xl bg-cream p-3 text-xs text-ink/60">
              <strong className="block text-ink/80">Google-Daten (nicht editierbar)</strong>
              {poi.address}
              {poi.rating !== undefined && (
                <> · ⭐ {poi.rating.toFixed(1)}</>
              )}
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
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
