import type { Category } from '../../data/pois';
import { CATEGORIES, CATEGORY_EMOJI } from '../../data/pois';
import type { Family } from '../../settings/types';

export interface AddPoiFieldsValue {
  familyId: string;
  category: Category;
  note: string;
}

interface Props {
  families: Family[];
  value: AddPoiFieldsValue;
  onChange: (v: AddPoiFieldsValue) => void;
}

export function AddPoiFields({ families, value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Familie
        </span>
        <div className="flex flex-wrap gap-2">
          {families.map((f) => {
            const active = f.id === value.familyId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ ...value, familyId: f.id })}
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
                  style={
                    active ? undefined : { backgroundColor: f.color }
                  }
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
            const active = c === value.category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...value, category: c })}
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
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          rows={2}
          placeholder="Warum ist dieser Ort besonders?"
          className="w-full resize-none rounded-2xl border border-cream-dark bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>
    </div>
  );
}
