import { useState } from 'react';
import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import { AddPoiFields, type AddPoiFieldsValue } from './AddPoiFields';

interface Props {
  families: Family[];
  onCancel: () => void;
  onSave: (poi: POI) => void;
}

export function AddManual({ families, onCancel, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<AddPoiFieldsValue>({
    familyId: families[0]?.id ?? '',
    category: 'Sonstiges',
    note: '',
  });

  const handleSave = () => {
    if (!title.trim() || !fields.familyId) return;
    const id = `poi-${Date.now().toString(36)}`;
    onSave({
      id,
      title: title.trim(),
      category: fields.category,
      familyId: fields.familyId,
      description: fields.note.trim(),
      image: `https://picsum.photos/seed/${encodeURIComponent(id)}/600/400`,
      likes: 0,
      needsLocation: true,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
          Name
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Da Teo"
          className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
        />
      </div>

      <AddPoiFields families={families} value={fields} onChange={setFields} />

      <div className="rounded-2xl bg-cream p-3 text-xs text-ink/60">
        Dieser Ort landet in der <strong>Inbox</strong>, weil noch keine
        Koordinaten gesetzt sind. Du kannst ihn später über „Verorten" auf
        der Karte positionieren.
      </div>

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
