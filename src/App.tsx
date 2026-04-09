import { useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Header, type Tab } from './components/Header';
import { PasswordGate } from './components/PasswordGate';
import { MissingKeyNotice } from './components/MissingKeyNotice';
import { RomeMap } from './components/map/RomeMap';
import { PoiList } from './components/poi/PoiList';
import { DayPlanner } from './components/dayplanner/DayPlanner';
import { SettingsView } from './components/settings/SettingsView';
import { AddPoiMenu, type AddMode } from './components/add/AddPoiMenu';
import { LocatePoiModal } from './components/inbox/LocatePoiModal';
import { EditPoiModal } from './components/poi/EditPoiModal';
import { useLocalPOIs } from './hooks/useLocalPOIs';
import { useTripPlan } from './hooks/useTripPlan';
import { useSettings } from './hooks/useSettings';
import { eachDayInRange } from './lib/dates';
import type { RouteSummary } from './components/map/RoutePolyline';

function AppInner() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const hasKey = !!apiKey;

  const { pois, addPoi, likePoi, removePoi, updatePoi, setLocation } = useLocalPOIs();
  const {
    settings,
    setTripDates,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
  } = useSettings();
  const {
    plan,
    getDay,
    togglePoi,
    movePoi,
    clearDay,
    removePoiFromAll,
  } = useTripPlan();

  const [tab, setTab] = useState<Tab>('discover');
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [highlightedPoiId, setHighlightedPoiId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
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
    removePoi(id);
    removePoiFromAll(id);
  };

  const content = (
    <div className="flex h-full flex-col">
      <Header tab={tab} onTabChange={setTab} />
      <main className="flex flex-1 flex-col overflow-hidden">
        {tab !== 'settings' && (
          <div className="relative h-[45vh] w-full flex-shrink-0 bg-cream-dark">
            {hasKey ? (
              <RomeMap
                pois={pois}
                mode={tab === 'trip' ? 'plan' : 'discover'}
                planOrder={activeDayOrder}
                families={settings.families}
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
              onLocate={(id) => setLocatingPoiId(id)}
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
              summary={summary}
              onMove={(id, dir) => activeDay && movePoi(activeDay, id, dir)}
              onRemove={(id) => activeDay && togglePoi(activeDay, id)}
              onClear={() => activeDay && clearDay(activeDay)}
            />
          )}
          {tab === 'settings' && (
            <SettingsView
              settings={settings}
              onTripDates={setTripDates}
              onAddFamily={addFamily}
              onUpdateFamily={updateFamily}
              onRemoveFamily={removeFamily}
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
      <AppInner />
    </PasswordGate>
  );
}

export default App;
