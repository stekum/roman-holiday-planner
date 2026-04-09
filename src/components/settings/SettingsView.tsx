import { AlertTriangle } from 'lucide-react';
import type { Family, Settings } from '../../settings/types';
import { TripDatesEditor } from './TripDatesEditor';
import { FamilyEditor } from './FamilyEditor';

interface Props {
  settings: Settings;
  onTripDates: (start: string, end: string) => void;
  onAddFamily: (family: Omit<Family, 'id'>) => void;
  onUpdateFamily: (id: string, patch: Partial<Omit<Family, 'id'>>) => void;
  onRemoveFamily: (id: string) => void;
}

function hardReset() {
  if (
    !confirm(
      'Wirklich alle lokalen Daten löschen (POIs, Likes, Tagesplan, Einstellungen)? Das kann nicht rückgängig gemacht werden.',
    )
  ) {
    return;
  }
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('rhp:')) localStorage.removeItem(key);
  }
  sessionStorage.removeItem('rhp:unlocked');
  location.reload();
}

export function SettingsView({
  settings,
  onTripDates,
  onAddFamily,
  onUpdateFamily,
  onRemoveFamily,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <TripDatesEditor
        tripStart={settings.tripStart}
        tripEnd={settings.tripEnd}
        onChange={onTripDates}
      />
      <FamilyEditor
        families={settings.families}
        onAdd={onAddFamily}
        onUpdate={onUpdateFamily}
        onRemove={onRemoveFamily}
      />

      <section className="rounded-3xl border-2 border-dashed border-terracotta/40 bg-white p-5">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-terracotta" />
          <h2 className="text-lg font-semibold text-terracotta">Gefahrenzone</h2>
        </div>
        <p className="mb-3 text-sm text-ink/60">
          Löscht alle lokalen Daten dieser App (POIs, Likes, Tagesplan, Einstellungen,
          Passwort-Unlock). Danach wird die Seite neu geladen.
        </p>
        <button
          type="button"
          onClick={hardReset}
          className="rounded-2xl border-2 border-terracotta bg-white px-4 py-2 text-sm font-semibold text-terracotta hover:bg-terracotta hover:text-white"
        >
          Alle Daten zurücksetzen
        </button>
      </section>
    </div>
  );
}
