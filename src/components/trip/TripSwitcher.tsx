import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import {
  forgetWorkspace,
  getKnownWorkspaces,
  isValidWorkspaceId,
  rememberWorkspace,
  type KnownWorkspace,
} from '../../firebase/knownWorkspaces';
import {
  useActiveWorkspaceId,
  useSetActiveWorkspaceId,
} from '../../firebase/workspaceContext';

/**
 * Header chip that shows the active trip + opens a dropdown with all known
 * trips plus an inline "new trip" form. Replaces the static "Autunno"
 * subtitle after the multi-trip refactor (#70).
 */
export function TripSwitcher() {
  const activeId = useActiveWorkspaceId();
  const setActiveId = useSetActiveWorkspaceId();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<KnownWorkspace[]>(() => getKnownWorkspaces());
  const containerRef = useRef<HTMLDivElement>(null);

  // Refresh from localStorage whenever the menu opens — covers the case that
  // another tab added a workspace (or `rememberWorkspace` ran on the activeId
  // change since the component mounted).
  useEffect(() => {
    if (open) setList(getKnownWorkspaces());
  }, [open, activeId]);

  // Outside-click closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeEntry = useMemo(
    () => list.find((e) => e.id === activeId),
    [list, activeId],
  );
  const activeLabel = activeEntry?.displayName || activeId;

  function handleSelect(id: string) {
    if (id !== activeId) setActiveId(id);
    setOpen(false);
  }

  function handleForget(id: string) {
    if (id === activeId) return; // never remove the active one
    forgetWorkspace(id);
    setList(getKnownWorkspaces());
  }

  function handleCreate(id: string, displayName: string) {
    rememberWorkspace(id, displayName || undefined);
    setActiveId(id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs uppercase tracking-widest text-olive hover:text-olive-dark"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Trip wechseln. Aktuell: ${activeLabel}`}
      >
        <span className="max-w-[10rem] truncate">{activeLabel}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl bg-white p-2 shadow-lg shadow-ink/20 ring-1 ring-ink/5"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            Trips
          </p>
          <ul className="space-y-0.5">
            {list.map((entry) => (
              <li key={entry.id}>
                <div className="group flex items-center rounded-xl hover:bg-cream">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={entry.id === activeId}
                    onClick={() => handleSelect(entry.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                        entry.id === activeId
                          ? 'bg-olive text-white'
                          : 'border border-ink/20'
                      }`}
                    >
                      {entry.id === activeId && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {entry.displayName || entry.id}
                      </span>
                      {entry.displayName && (
                        <span className="block truncate text-[10px] text-ink/40">
                          {entry.id}
                        </span>
                      )}
                    </span>
                  </button>
                  {entry.id !== activeId && (
                    <button
                      type="button"
                      onClick={() => handleForget(entry.id)}
                      aria-label={`${entry.displayName || entry.id} aus Liste entfernen`}
                      title="Aus Liste entfernen (Trip-Daten bleiben in Firestore erhalten)"
                      className="mr-2 rounded-lg p-1.5 text-ink/30 opacity-0 transition hover:bg-terracotta/10 hover:text-terracotta group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-1 border-t border-cream-dark pt-1">
            <NewTripForm onCreate={handleCreate} existingIds={list.map((e) => e.id)} />
          </div>
        </div>
      )}
    </div>
  );
}

function NewTripForm({
  onCreate,
  existingIds,
}: {
  onCreate: (id: string, displayName: string) => void;
  existingIds: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [id, setId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) idInputRef.current?.focus();
  }, [expanded]);

  function reset() {
    setId('');
    setDisplayName('');
    setError(null);
    setExpanded(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedId = id.trim().toLowerCase();
    const trimmedName = displayName.trim();
    if (!isValidWorkspaceId(trimmedId)) {
      setError('Nur Kleinbuchstaben, Ziffern und Bindestrich (max 40).');
      return;
    }
    if (existingIds.includes(trimmedId)) {
      setError('Trip-ID existiert bereits in der Liste.');
      return;
    }
    onCreate(trimmedId, trimmedName);
    reset();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink/70 hover:bg-cream hover:text-ink"
      >
        <Plus className="h-4 w-4" />
        Neuen Trip anlegen
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 px-3 py-2">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
          Trip-ID
        </label>
        <input
          ref={idInputRef}
          type="text"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setError(null);
          }}
          placeholder="z.B. japan-may26"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-ink/10 bg-cream/50 px-2 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-olive focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
          Anzeigename (optional)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="z.B. Japan Mai 2026"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-ink/10 bg-cream/50 px-2 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-olive focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-terracotta">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-olive px-3 py-1.5 text-sm font-semibold text-white hover:bg-olive-dark"
        >
          Anlegen
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink/5 px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/10"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
