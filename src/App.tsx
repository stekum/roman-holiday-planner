import { useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Header, type Tab } from './components/Header';
import { PasswordGate } from './components/PasswordGate';
import { MissingKeyNotice } from './components/MissingKeyNotice';
import { RomeMap } from './components/map/RomeMap';
import { PoiList, type ViewMode } from './components/poi/PoiList';
import { DayPlanner } from './components/dayplanner/DayPlanner';
import { SettingsView } from './components/settings/SettingsView';
import { AddPoiMenu, type AddMode } from './components/add/AddPoiMenu';
import { LocatePoiModal } from './components/inbox/LocatePoiModal';
import { EditPoiModal } from './components/poi/EditPoiModal';
import { useWorkspace } from './firebase/useWorkspace';
import { useWeather } from './hooks/useWeather';
import { useMyLocation } from './hooks/useMyLocation';
import { isFirebaseConfigured } from './firebase/firebase';
import { eachDayInRange } from './lib/dates';
import type { RouteSummary } from './components/map/RoutePolyline';
import { Loader2, WifiOff } from 'lucide-react';

function FirebaseMissingNotice() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-3xl bg-white p-6 shadow-md shadow-ink/10">
        <h2
          className="mb-2 text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Firebase nicht konfiguriert
        </h2>
        <p className="text-sm text-ink/60">
          Diese Version der App nutzt Firebase für die kollaborative
          Synchronisation. Setze <code>VITE_FIREBASE_*</code> in{' '}
          <code>.env.local</code> und lade neu.
        </p>
      </div>
    </div>
  );
}

function AppInner() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const hasKey = !!apiKey;

  const workspace = useWorkspace();
  const {
    status,
    error: workspaceError,
    pois,
    addPoi,
    updatePoi,
    setLocation,
    likePoi,
    removePoi,
    settings,
    setTripDates,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
    setHomebase,
    plan,
    getDay,
    togglePoi,
    movePoi,
    setDayOrder,
    clearDay,
    removePoiFromAll,
  } = workspace;

  const weatherByDay = useWeather(settings.homebase?.coords);
  const { location: myLocation } = useMyLocation();
  const [tab, setTab] = useState<Tab>('discover');
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [highlightedPoiId, setHighlightedPoiId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (typeof window !== 'undefined' && window.innerWidth < 640) ? 'compact' : 'grid',
  );
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedPlaceId, setPickedPlaceId] = useState<string | null>(null);
  const [locatingPoiId, setLocatingPoiId] = useState<string | null>(null);
  const locatingPoi = locatingPoiId
    ? pois.find((p) => p.id === locatingPoiId) ?? null
    : null;
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null);
  const editingPoi = editingPoiId
    ? pois.find((p) => p.id === editingPoiId) ?? null
    : null;

  const days = useMemo(
    () => eachDayInRange(settings.tripStart, settings.tripEnd),
    [settings.tripStart, settings.tripEnd],
  );
  const [activeDay, setActiveDay] = useState<string>(() => days[0] ?? '');

  // fall back to first day if active day falls out of range
  if (days.length > 0 && !days.includes(activeDay)) {
    setActiveDay(days[0]);
  }

  const activeDayOrder = activeDay ? getDay(activeDay) : [];
  const dayCounts: Record<string, number> = {};
  const assignedDaysByPoi: Record<string, string[]> = {};
  for (const d of days) {
    const ids = plan[d] ?? [];
    dayCounts[d] = ids.length;
    for (const id of ids) {
      if (!assignedDaysByPoi[id]) assignedDaysByPoi[id] = [];
      assignedDaysByPoi[id].push(d);
    }
  }

  const handleRemove = (id: string) => {
    void removePoi(id);
    void removePoiFromAll(id);
  };

  const handleSetAsHomebase = (id: string) => {
    const poi = pois.find((p) => p.id === id);
    if (!poi?.coords) return;
    if (!confirm(`„${poi.title}" als Homebase setzen?`)) return;
    void setHomebase({
      name: poi.title,
      address: poi.address ?? poi.description ?? '',
      coords: poi.coords,
      placeId: poi.placeId,
      image: poi.image || undefined,
    });
  };

  const connectionBanner =
    status === 'connecting' ? (
      <div className="flex items-center gap-2 bg-olive/10 px-4 py-2 text-xs text-olive-dark">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verbinde mit Firebase…
      </div>
    ) : status === 'error' ? (
      <div className="flex items-start gap-2 bg-terracotta/10 px-4 py-2 text-xs text-terracotta">
        <WifiOff className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <div>
          <strong>Firebase-Verbindung fehlgeschlagen.</strong>{' '}
          {workspaceError ?? 'Änderungen werden nicht synchronisiert.'}
        </div>
      </div>
    ) : null;

  const content = (
    <div className="flex h-full flex-col">
      <Header tab={tab} onTabChange={setTab} />
      {connectionBanner}
      <main className="flex flex-1 flex-col overflow-hidden">
        {tab !== 'settings' && (
          <div className={`relative w-full flex-shrink-0 bg-cream-dark ${viewMode === 'compact' ? 'h-[60vh]' : 'h-[45vh]'}`}>
            {hasKey ? (
              <RomeMap
                pois={pois}
                mode={tab === 'trip' ? 'plan' : 'discover'}
                planOrder={activeDayOrder}
                families={settings.families}
                homebase={settings.homebase}
                myLocation={myLocation}
                highlightedPoiId={highlightedPoiId}
                pickMode={addMode === 'map'}
                onMapClick={(pick) => {
                  // Set the picked location data first
                  setPickedCoords(pick.coords);
                  setPickedPlaceId(pick.placeId ?? null);
                  // If we're not already in an add-from-map flow and a Google POI
                  // was clicked (has placeId), jump straight into the add flow.
                  if (addMode === null && pick.placeId) {
                    setAddMode('map');
                  }
                }}
                onDismiss={() => setHighlightedPoiId(null)}
                onRouteSummary={setSummary}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <MissingKeyNotice />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {tab === 'discover' && (
            <PoiList
              pois={pois}
              selectedIds={activeDayOrder}
              allDays={days}
              assignedDaysByPoi={assignedDaysByPoi}
              getFamily={getFamily}
              onLike={likePoi}
              onToggleSelect={(id) => activeDay && togglePoi(activeDay, id)}
              onRemove={handleRemove}
              onEdit={(id) => setEditingPoiId(id)}
              onHighlight={(id) =>
                setHighlightedPoiId((prev) => (prev === id ? null : id))
              }
              onSetAsHomebase={handleSetAsHomebase}
              homebase={settings.homebase}
              onLocate={(id) => setLocatingPoiId(id)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
          {tab === 'trip' && (
            <DayPlanner
              pois={pois}
              days={days}
              activeDay={activeDay}
              onDayChange={setActiveDay}
              getFamily={getFamily}
              dayOrder={activeDayOrder}
              dayCounts={dayCounts}
              weather={weatherByDay}
              summary={summary}
              onMove={(id, dir) => activeDay && movePoi(activeDay, id, dir)}
              onRemove={(id) => activeDay && togglePoi(activeDay, id)}
              onClear={() => activeDay && clearDay(activeDay)}
              onReorder={(newOrder) => {
                if (activeDay) void setDayOrder(activeDay, newOrder);
              }}
            />
          )}
          {tab === 'settings' && (
            <SettingsView
              settings={settings}
              onTripDates={setTripDates}
              onAddFamily={addFamily}
              onUpdateFamily={updateFamily}
              onRemoveFamily={removeFamily}
              onSetHomebase={setHomebase}
              onMigrateFromLocal={workspace.migrateFromLocal}
            />
          )}
        </div>
      </main>
      {tab !== 'settings' && (
        <AddPoiMenu
          families={settings.families}
          mode={addMode}
          setMode={(m) => {
            setAddMode(m);
            if (m !== 'map') {
              setPickedCoords(null);
              setPickedPlaceId(null);
            }
          }}
          pickedMapCoords={pickedCoords}
          pickedMapPlaceId={pickedPlaceId}
          onClearPicked={() => {
            setPickedCoords(null);
            setPickedPlaceId(null);
          }}
          onAdd={addPoi}
        />
      )}
      {locatingPoi && (
        <LocatePoiModal
          poi={locatingPoi}
          onCancel={() => setLocatingPoiId(null)}
          onSave={(coords, placeId) => {
            setLocation(locatingPoi.id, coords, placeId);
            setLocatingPoiId(null);
          }}
        />
      )}
      {editingPoi && (
        <EditPoiModal
          poi={editingPoi}
          families={settings.families}
          onCancel={() => setEditingPoiId(null)}
          onSave={(patch) => {
            updatePoi(editingPoi.id, patch);
            setEditingPoiId(null);
          }}
        />
      )}
    </div>
  );

  if (!apiKey) return content;

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'routes', 'geocoding']}>
      {content}
    </APIProvider>
  );
}

function App() {
  return (
    <PasswordGate>
      {isFirebaseConfigured ? <AppInner /> : <FirebaseMissingNotice />}
    </PasswordGate>
  );
}

export default App;
