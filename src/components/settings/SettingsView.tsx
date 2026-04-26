import { useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import type { Family, Homebase, Settings, TransitDay, TripConfig } from '../../settings/types';
import type { POI } from '../../data/pois';
import type { TripPlan } from '../../hooks/useTripPlan';
import { DEFAULT_SETTINGS } from '../../settings/defaults';
import { TripDatesEditor } from './TripDatesEditor';
import { TripConfigEditor } from './TripConfigEditor';
import { FamilyEditor } from './FamilyEditor';
import { HomebasesEditor } from './HomebasesEditor';
import { TransitDaysEditor } from './TransitDaysEditor';
import { getPlacesBias } from '../../lib/placesBias';
import { getTripConfig } from '../../settings/tripConfig';
import { getHomebases } from '../../settings/homebases';
import { MyFamilyEditor } from './MyFamilyEditor';
import { ApprovalQueue } from './ApprovalQueue';
import { WorkspaceMembersSection } from './WorkspaceMembersSection';

interface Props {
  settings: Settings;
  onTripDates: (start: string, end: string) => void;
  onAddFamily: (family: Omit<Family, 'id'>) => void;
  onUpdateFamily: (id: string, patch: Partial<Omit<Family, 'id'>>) => void;
  onRemoveFamily: (id: string) => void;
  onSetHomebases: (list: Homebase[]) => void;
  onSetTransitDays: (list: TransitDay[]) => void;
  onSetTripConfig: (cfg: TripConfig) => void;
  /** Optional — if present, shows a „Lokale Daten hochladen"-Button. */
  onMigrateFromLocal?: (data: {
    pois: POI[];
    settings: Settings;
    plan: TripPlan;
  }) => Promise<void>;
  /** Admin-only: show the approval queue section. */
  isAdmin: boolean;
  /** Current device's "I belong to" family — for voting. */
  myFamilyId: string;
  onMyFamilyChange: (id: string) => void;
}

function readLocalData(): {
  pois: POI[];
  settings: Settings;
  plan: TripPlan;
} {
  let pois: POI[] = [];
  let settings: Settings = DEFAULT_SETTINGS;
  let plan: TripPlan = {};
  try {
    const raw = localStorage.getItem('rhp:pois');
    if (raw) pois = JSON.parse(raw);
  } catch {
    /* noop */
  }
  try {
    const raw = localStorage.getItem('rhp:settings');
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  try {
    const raw = localStorage.getItem('rhp:tripplan');
    if (raw) plan = JSON.parse(raw);
  } catch {
    /* noop */
  }
  return { pois, settings, plan };
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
  onSetHomebases,
  onSetTransitDays,
  onSetTripConfig,
  onMigrateFromLocal,
  isAdmin,
  myFamilyId,
  onMyFamilyChange,
}: Props) {
  const [migrationState, setMigrationState] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const localData = readLocalData();
  const localPoiCount = localData.pois.length;

  const handleMigrate = async () => {
    if (!onMigrateFromLocal) return;
    if (
      !confirm(
        `Wirklich ${localPoiCount} lokal gespeicherte POIs + aktuelle Einstellungen in die gemeinsame Firebase-Datenbank hochladen? Orte die bereits in Firebase existieren werden überschrieben.`,
      )
    ) {
      return;
    }
    setMigrationState('uploading');
    setMigrationError(null);
    try {
      await onMigrateFromLocal(localData);
      setMigrationState('done');
    } catch (err) {
      setMigrationState('error');
      setMigrationError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      {isAdmin && <ApprovalQueue />}
      <TripDatesEditor
        tripStart={settings.tripStart}
        tripEnd={settings.tripEnd}
        onChange={onTripDates}
      />
      <TripConfigEditor
        tripConfig={settings.tripConfig}
        onChange={onSetTripConfig}
      />
      <HomebasesEditor
        homebases={getHomebases(settings)}
        tripStart={settings.tripStart}
        tripEnd={settings.tripEnd}
        bias={getPlacesBias(getTripConfig(settings), getHomebases(settings)[0])}
        onChange={onSetHomebases}
      />
      <TransitDaysEditor
        transitDays={settings.transitDays ?? []}
        homebases={getHomebases(settings)}
        tripStart={settings.tripStart}
        tripEnd={settings.tripEnd}
        onChange={onSetTransitDays}
      />
      <FamilyEditor
        families={settings.families}
        onAdd={onAddFamily}
        onUpdate={onUpdateFamily}
        onRemove={onRemoveFamily}
      />
      <MyFamilyEditor
        families={settings.families}
        myFamilyId={myFamilyId}
        onChange={onMyFamilyChange}
      />
      <WorkspaceMembersSection />

      {onMigrateFromLocal && localPoiCount > 0 && (
        <section className="rounded-3xl border-2 border-dashed border-olive/40 bg-white p-5">
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-5 w-5 text-olive" />
            <h2 className="text-lg font-semibold text-olive-dark">
              Lokale Daten hochladen
            </h2>
          </div>
          <p className="mb-3 text-sm text-ink/60">
            Du hast noch <strong>{localPoiCount}</strong> POIs aus der alten
            Offline-Version im Browser. Du kannst sie in die gemeinsame
            Firebase-Datenbank übertragen — danach sehen alle Familienmitglieder
            sie. Seed-POIs (Colosseo, Pantheon etc.) werden dabei übersprungen.
          </p>
          <button
            type="button"
            onClick={handleMigrate}
            disabled={migrationState === 'uploading'}
            className="rounded-2xl bg-olive px-4 py-2 text-sm font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
          >
            {migrationState === 'uploading'
              ? 'Lade hoch…'
              : `${localPoiCount} POIs hochladen`}
          </button>
          {migrationState === 'done' && (
            <p className="mt-2 text-xs text-olive">
              ✓ Hochgeladen. Du kannst den lokalen Speicher in der Gefahrenzone
              unten löschen.
            </p>
          )}
          {migrationState === 'error' && (
            <p className="mt-2 text-xs text-terracotta">
              ✗ Fehler: {migrationError}
            </p>
          )}
        </section>
      )}

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
