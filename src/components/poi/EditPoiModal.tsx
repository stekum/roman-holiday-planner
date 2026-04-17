import { useState } from 'react';
import { MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react';
import type { Category, POI } from '../../data/pois';
import { CATEGORIES } from '../../data/pois';
import type { Family } from '../../settings/types';
import { getCategoryEmoji } from '../../settings/tripConfig';

interface Props {
  poi: POI;
  families: Family[];
  onCancel: () => void;
  onSave: (patch: Partial<POI>) => void;
  categories?: string[];
  myFamilyId: string;
  onAddComment: (poiId: string, familyId: string, text: string) => void;
  onRemoveComment: (poiId: string, commentId: string) => void;
}

function formatCommentTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `heute, ${time}`;
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

export function EditPoiModal({
  poi,
  families,
  onCancel,
  onSave,
  categories = CATEGORIES,
  myFamilyId,
  onAddComment,
  onRemoveComment,
}: Props) {
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
              {categories.map((c) => {
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
                    {getCategoryEmoji(c)} {c}
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

          <CommentThread
            poi={poi}
            families={families}
            myFamilyId={myFamilyId}
            onAdd={(text) => onAddComment(poi.id, myFamilyId, text)}
            onRemove={(commentId) => onRemoveComment(poi.id, commentId)}
          />

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

function CommentThread({
  poi,
  families,
  myFamilyId,
  onAdd,
  onRemove,
}: {
  poi: POI;
  families: Family[];
  myFamilyId: string;
  onAdd: (text: string) => void;
  onRemove: (commentId: string) => void;
}) {
  const [text, setText] = useState('');
  const comments = poi.comments ?? [];
  const familyById = (id: string) => families.find((f) => f.id === id);

  const submit = () => {
    if (!myFamilyId || !text.trim()) return;
    onAdd(text);
    setText('');
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-terracotta" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">
          Notizen & Kommentare{comments.length > 0 && ` (${comments.length})`}
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="mb-2 rounded-2xl bg-cream px-3 py-2 text-xs text-ink/50">
          Noch keine Kommentare. _"War da gestern, Carbonara göttlich, ABER 45 min Wartezeit."_
        </p>
      ) : (
        <ul className="mb-2 space-y-1.5">
          {comments.map((c) => {
            const fam = familyById(c.familyId);
            const isMine = c.familyId === myFamilyId;
            return (
              <li
                key={c.id}
                className="group flex items-start gap-2 rounded-2xl bg-cream px-3 py-2 text-sm"
              >
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 text-xs text-ink/50">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: fam?.color ?? '#999' }}
                    />
                    <span className="font-semibold text-ink/80">{fam?.name ?? 'Unbekannt'}</span>
                    <span>·</span>
                    <span>{formatCommentTime(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-ink">{c.text}</div>
                </div>
                {isMine && (
                  <button
                    type="button"
                    onClick={() => onRemove(c.id)}
                    className="opacity-0 transition group-hover:opacity-100 rounded-full p-1 text-ink/40 hover:bg-terracotta/20 hover:text-terracotta"
                    aria-label="Kommentar löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={
            myFamilyId
              ? 'Deine Notiz oder Erfahrung… (Cmd+Enter zum Senden)'
              : 'Setze erst „Meine Familie" in Settings'
          }
          disabled={!myFamilyId}
          className="flex-1 resize-none rounded-2xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:bg-white disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!myFamilyId || !text.trim()}
          className="flex items-center gap-1 self-end rounded-2xl bg-terracotta px-3 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Senden
        </button>
      </div>
    </div>
  );
}
