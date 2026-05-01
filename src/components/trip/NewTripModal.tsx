import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MapPin, Plus, X } from 'lucide-react';
import { CityPicker, type CityPick } from '../settings/CityPicker';
import {
  isValidWorkspaceId,
  rememberWorkspace,
} from '../../firebase/knownWorkspaces';
import { createWorkspace } from '../../firebase/createWorkspace';
import { useSetActiveWorkspaceId } from '../../firebase/workspaceContext';

interface Props {
  open: boolean;
  onClose: () => void;
  /** IDs die schon im lokalen Registry stehen — verhindert Doppel-Anlage. */
  existingIds: string[];
}

/**
 * #72: Trip-Erstellungs-Wizard als Modal. Sammelt Trip-ID, Anzeigename,
 * Stadt (via CityPicker → liefert auch Currency/Timezone) und Reise-Datum
 * in einem Schritt. Erstellt Workspace direkt in Firestore mit Initial-
 * Settings und switcht den aktiven Workspace.
 *
 * Familien-Setup ist NICHT Teil des Wizards — wird in Settings nach
 * Trip-Anlage erledigt (existing flow). Wir zeigen dafür einen Hinweis.
 */
export function NewTripModal({ open, onClose, existingIds }: Props) {
  const setActiveId = useSetActiveWorkspaceId();
  const idInputRef = useRef<HTMLInputElement>(null);

  const [tripId, setTripId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState<CityPick | null>(null);
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus erstes Feld beim Open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => idInputRef.current?.focus());
    } else {
      // Reset State wenn Modal schließt
      setTripId('');
      setDisplayName('');
      setCity(null);
      setTripStart('');
      setTripEnd('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // ESC + Outside-Click schließt
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  // #72: Portal an document.body, damit das Modal aus dem Header-
  // Stacking-Context (sticky + backdrop-blur) entkommt — sonst legt
  // sich Leaflet-Map (z-index 400+) über das Modal.

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedId = tripId.trim().toLowerCase();
    const trimmedName = displayName.trim();

    // Validierung
    if (!isValidWorkspaceId(trimmedId)) {
      setError('Trip-ID: nur Kleinbuchstaben, Ziffern und Bindestrich (max 40).');
      return;
    }
    if (existingIds.includes(trimmedId)) {
      setError('Diese Trip-ID ist bereits vergeben.');
      return;
    }
    if (!city) {
      setError('Bitte eine Stadt auswählen.');
      return;
    }
    if (!tripStart || !tripEnd) {
      setError('Bitte Start- und End-Datum angeben.');
      return;
    }
    if (tripStart > tripEnd) {
      setError('Start-Datum muss vor End-Datum liegen.');
      return;
    }

    setSubmitting(true);
    try {
      await createWorkspace({
        workspaceId: trimmedId,
        tripConfig: {
          city: city.city,
          country: city.country,
          language: 'Deutsch',
          categories: ['Kultur', 'Pizza', 'Gelato', 'Trattoria', 'Aperitivo', 'Instagram', 'Sonstiges'],
          center: city.center,
          timezone: city.timezone,
          currency: city.currency,
        },
        tripStart,
        tripEnd,
      });
      rememberWorkspace(trimmedId, trimmedName || undefined);
      setActiveId(trimmedId);
      onClose();
    } catch (err) {
      console.error('[NewTripModal] create failed:', err);
      setError(err instanceof Error ? err.message : 'Trip konnte nicht angelegt werden.');
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-trip-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/30 px-3 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-cream shadow-2xl shadow-ink/30">
        <div className="flex items-center gap-3 border-b border-cream-dark/50 bg-white px-5 py-4">
          <Plus className="h-5 w-5 text-terracotta" />
          <h2
            id="new-trip-title"
            className="text-lg text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Neuen Trip anlegen
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Schließen"
            className="ml-auto rounded-full p-1.5 text-ink/40 hover:bg-cream hover:text-ink disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                Trip-ID
              </span>
              <input
                ref={idInputRef}
                type="text"
                value={tripId}
                onChange={(e) => {
                  setTripId(e.target.value);
                  setError(null);
                }}
                placeholder="z.B. japan-mai26"
                autoComplete="off"
                disabled={submitting}
                className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none focus:border-terracotta disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                Anzeigename
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z.B. Japan Mai 2026"
                autoComplete="off"
                disabled={submitting}
                className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none focus:border-terracotta disabled:opacity-50"
              />
            </label>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
              Stadt
            </span>
            {city ? (
              <div className="flex items-center gap-2 rounded-xl border border-olive/40 bg-olive/5 px-3 py-2 text-sm text-ink">
                <MapPin className="h-4 w-4 text-olive" />
                <span className="font-medium">{city.city}</span>
                <span className="text-ink/50">· {city.country}</span>
                <button
                  type="button"
                  onClick={() => setCity(null)}
                  disabled={submitting}
                  className="ml-auto text-xs font-semibold text-olive hover:text-olive-dark disabled:opacity-50"
                >
                  Ändern
                </button>
              </div>
            ) : (
              <CityPicker onPick={setCity} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                Anreise
              </span>
              <input
                type="date"
                value={tripStart}
                onChange={(e) => setTripStart(e.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none focus:border-terracotta disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                Abreise
              </span>
              <input
                type="date"
                value={tripEnd}
                onChange={(e) => setTripEnd(e.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none focus:border-terracotta disabled:opacity-50"
              />
            </label>
          </div>

          <p className="text-[11px] text-ink/50">
            Familien fügst du später in Settings hinzu.
          </p>

          {error && (
            <p className="rounded-xl bg-terracotta/10 px-3 py-2 text-xs text-terracotta">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl bg-ink/5 px-4 py-2 text-sm text-ink/70 hover:bg-ink/10 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:bg-terracotta-dark disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Wird angelegt…
                </>
              ) : (
                'Trip anlegen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
