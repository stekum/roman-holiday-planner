import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Header, type Tab } from './components/Header';
import { AuthGate } from './components/auth/AuthGate';
import { MissingKeyNotice } from './components/MissingKeyNotice';
import { RomeMap } from './components/map/RomeMap';
import { PoiList, type ViewMode } from './components/poi/PoiList';
import { AiSuggestionsPanel } from './components/poi/AiSuggestionsPanel';
import { DayPlanner } from './components/dayplanner/DayPlanner';
import { SettingsView } from './components/settings/SettingsView';
import { AddPoiMenu, type AddMode } from './components/add/AddPoiMenu';
import { LocatePoiModal } from './components/inbox/LocatePoiModal';
import { EditPoiModal } from './components/poi/EditPoiModal';
import { useWorkspace } from './firebase/useWorkspace';
import { getTripConfig, currencyFromCountry } from './settings/tripConfig';
import { useWeather } from './hooks/useWeather';
import { useMyFamily } from './hooks/useMyFamily';
import { useMyLocation } from './hooks/useMyLocation';
import { isFirebaseConfigured } from './firebase/firebase';
import type { POI, Category } from './data/pois';
import { eachDayInRange } from './lib/dates';
import { generateDayBriefing } from './lib/aiDayBriefing';
import type { RouteSummary } from './components/map/RoutePolyline';
import type { Homebase } from './settings/types';
import { Loader2, WifiOff } from 'lucide-react';
// import { persistAndUpdatePhoto } from './lib/photoStorage'; // TODO: re-enable after CORS fix (#91)

/**
 * Render-less component (must live inside APIProvider) that auto-fetches a
 * photo for the homebase when it has a placeId but no image yet.
 * Runs at app startup — not only when the Settings tab is open.
 */
function HomebasePhotoSync({
  homebase,
  onUpdate,
}: {
  homebase: Homebase | undefined;
  onUpdate: (hb: Homebase) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!placesLib || !homebase?.placeId || homebase.image) return;
    if (fetchedRef.current === homebase.placeId) return;
    fetchedRef.current = homebase.placeId;

    const service = new placesLib.PlacesService(document.createElement('div'));
    service.getDetails(
      { placeId: homebase.placeId, fields: ['photos'] },
      (place, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && place?.photos?.[0]) {
          try {
            const photoUrl = place.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 });
            if (photoUrl) onUpdate({ ...homebase, image: photoUrl });
          } catch {
            /* ignore */
          }
        }
      },
    );
  }, [placesLib, homebase, onUpdate]);

  return null;
}

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

const ADMIN_EMAIL = 'stefan.kummert@gmail.com';

interface AppInnerProps {
  user: import('firebase/auth').User;
}

function AppInner({ user }: AppInnerProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const hasKey = !!apiKey;
  const isAdmin = user.email === ADMIN_EMAIL;

  const workspace = useWorkspace();
  const {
    status,
    error: workspaceError,
    pois,
    addPoi,
    updatePoi,
    setLocation,
    likePoi,
    votePoi,
    addComment,
    removeComment,
    setVisitStatus,
    removePoi,
    settings,
    setTripDates,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
    setHomebase,
    setTripConfig,
    plan,
    getDay,
    togglePoi,
    movePoi,
    setDayOrder,
    setDayDescription,
    getDayDescription,
    setDayBriefing,
    getDayBriefing,
    setDayBudget,
    getDayBudget,
    clearDay,
    removePoiFromAll,
  } = workspace;

  const weatherByDay = useWeather(settings.homebase?.coords);
  const { location: myLocation } = useMyLocation();
  const { myFamilyId, setMyFamilyId } = useMyFamily(settings.families);
  const [tab, setTab] = useState<Tab>('discover');
  const [streetViewCoords, setStreetViewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [highlightedPoiId, setHighlightedPoiId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (typeof window !== 'undefined' && window.innerWidth < 640) ? 'compact' : 'grid',
  );
  const [filterCategory, setFilterCategory] = useState<Category | null>(null);
  const [filterFamily, setFilterFamily] = useState<string | null>(null);
  const [filterInbox, setFilterInbox] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredPois = useMemo(() => {
    let list = pois;
    if (filterCategory) list = list.filter((p) => p.category === filterCategory);
    if (filterFamily) list = list.filter((p) => p.familyId === filterFamily);
    if (filterInbox) list = list.filter((p) => p.needsLocation);
    return list;
  }, [pois, filterCategory, filterFamily, filterInbox]);

  // Set of POI IDs visible on the map (null = show all).
  // Passed to RomeMap so markers stay mounted but hidden ones get display:none.
  const visiblePoiIds = useMemo(() => {
    if (!filterCategory && !filterFamily && !filterInbox) return null;
    return new Set(filteredPois.map((p) => p.id));
  }, [filteredPois, filterCategory, filterFamily, filterInbox]);
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
  const [briefingLoadingDay, setBriefingLoadingDay] = useState<string | null>(null);
  const [briefingError, setBriefingError] = useState<{
    dayIso: string;
    message: string;
  } | null>(null);

  // fall back to first day if active day falls out of range
  if (days.length > 0 && !days.includes(activeDay)) {
    setActiveDay(days[0]);
  }

  const activeDayOrder = useMemo(
    () => (activeDay ? getDay(activeDay) : []),
    [activeDay, getDay],
  );
  const activeDayPois = useMemo(
    () =>
      activeDayOrder
        .map((id) => pois.find((p) => p.id === id))
        .filter(Boolean) as POI[],
    [activeDayOrder, pois],
  );
  const activeDayLabel = useMemo(() => {
    if (!activeDay) return '';
    const dayNumber = days.indexOf(activeDay) + 1;
    return `Tag ${dayNumber} — ${activeDay}`;
  }, [activeDay, days]);
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

  // One-time migration: re-save POIs with Google photo URLs to trigger
  // the Cloud Function `persistPoiPhoto` which downloads them server-side.
  const migrationRan = useRef(false);
  useEffect(() => {
    if (migrationRan.current || status !== 'ready' || pois.length === 0) return;
    migrationRan.current = true;
    const googlePhotoPois = pois.filter(
      (p) =>
        p.image?.trim() &&
        !p.image.includes('firebasestorage.googleapis.com') &&
        !p.image.includes('storage.googleapis.com') &&
        !p.image.includes('firebasestorage.app') &&
        (p.image.includes('googleapis.com') || p.image.includes('googleusercontent.com')),
    );
    if (googlePhotoPois.length > 0) {
      console.log(`[PhotoMigration] Triggering Cloud Function for ${googlePhotoPois.length} POIs...`);
      for (const poi of googlePhotoPois) {
        // Re-save with a timestamp field to trigger the Cloud Function
        // Touch the image field to trigger the Cloud Function's onDocumentWritten
        void updatePoi(poi.id, { image: poi.image });
      }
    }
  }, [status, pois, updatePoi]);

  // Photo persistence is handled server-side by the Cloud Function
  // `persistPoiPhoto` which triggers on every Firestore POI write.
  // No client-side download needed — the function runs on Google's
  // servers where there are no CORS restrictions.

  const handleAddPoi = (poi: POI) => {
    void addPoi(poi);
    // Cloud Function `persistPoiPhoto` will automatically detect the
    // Google photo URL and persist it to Firebase Storage.
  };

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

  const handleStreetView = (id: string) => {
    const poi = pois.find((p) => p.id === id);
    if (!poi?.coords) return;
    // Settings tab has no map — switch to Entdecken first so Street View
    // has a container to render into.
    if (tab === 'settings') setTab('discover');
    setStreetViewCoords(poi.coords);
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

  const handleHomebaseUpdate = useCallback(
    (hb: Homebase) => { void setHomebase(hb); },
    [setHomebase],
  );

  const handleGenerateBriefing = useCallback(() => {
    if (!activeDay || activeDayPois.length === 0) return;

    const dayIso = activeDay;
    const dayLabel = activeDayLabel;
    const weather = weatherByDay[dayIso];
    const poisForBriefing = activeDayPois;

    setBriefingLoadingDay(dayIso);
    setBriefingError(null);

    void (async () => {
      try {
        const briefing = await generateDayBriefing({
          dayIso,
          dayLabel,
          homebase: settings.homebase,
          weather,
          pois: poisForBriefing,
          tripConfig: getTripConfig(settings),
        });
        await setDayBriefing(dayIso, briefing);
      } catch (err) {
        console.error('[AI Briefing] generation failed:', err);
        setBriefingError({
          dayIso,
          message:
            err instanceof Error
              ? err.message
              : 'AI-Briefing fehlgeschlagen. Bitte erneut versuchen.',
        });
      } finally {
        setBriefingLoadingDay((current) => (current === dayIso ? null : current));
      }
    })();
  }, [
    activeDay,
    activeDayLabel,
    activeDayPois,
    settings,
    setDayBriefing,
    weatherByDay,
  ]);

  const content = (
    <div className="flex h-full flex-col">
      <Header tab={tab} onTabChange={setTab} user={user} />
      {connectionBanner}
      {hasKey && (
        <HomebasePhotoSync
          homebase={settings.homebase}
          onUpdate={handleHomebaseUpdate}
        />
      )}
      <main className="flex flex-1 flex-col overflow-hidden">
        {tab !== 'settings' && (
          <div className={`relative w-full flex-shrink-0 bg-cream-dark ${viewMode === 'compact' ? 'h-[60vh]' : 'h-[45vh]'}`}>
            {hasKey ? (
              <RomeMap
                pois={pois}
                visiblePoiIds={tab === 'discover' ? visiblePoiIds : null}
                mode={tab === 'trip' ? 'plan' : 'discover'}
                planOrder={activeDayOrder}
                families={settings.families}
                homebase={settings.homebase}
                myLocation={myLocation}
                highlightedPoiId={highlightedPoiId}
                streetViewPosition={streetViewCoords}
                onStreetViewClose={() => setStreetViewCoords(null)}
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
                onStreetViewRequest={(coords) => setStreetViewCoords(coords)}
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
            <>
              <div className="px-4 pt-3">
                <AiSuggestionsPanel
                  pois={pois}
                  homebase={settings.homebase}
                  families={settings.families}
                  myFamilyId={myFamilyId}
                  onAddPoi={handleAddPoi}
                  tripConfig={getTripConfig(settings)}
                />
              </div>
              <PoiList
              pois={pois}
              selectedIds={activeDayOrder}
              allDays={days}
              assignedDaysByPoi={assignedDaysByPoi}
              families={settings.families}
              myFamilyId={myFamilyId}
              getFamily={getFamily}
              onLike={likePoi}
              onVote={(id, vote) => void votePoi(id, myFamilyId, vote)}
              onToggleSelect={(id) => activeDay && togglePoi(activeDay, id)}
              onRemove={handleRemove}
              onEdit={(id) => setEditingPoiId(id)}
              onHighlight={(id) =>
                setHighlightedPoiId((prev) => (prev === id ? null : id))
              }
              onSetAsHomebase={handleSetAsHomebase}
              homebase={settings.homebase}
              onLocate={(id) => setLocatingPoiId(id)}
              onStreetView={handleStreetView}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filterCategory={filterCategory}
              filterFamily={filterFamily}
              filterInbox={filterInbox}
              showFilters={showFilters}
              onFilterCategoryChange={setFilterCategory}
              onFilterFamilyChange={setFilterFamily}
              onFilterInboxChange={setFilterInbox}
              onShowFiltersChange={setShowFilters}
              onClearFilters={() => {
                setFilterCategory(null);
                setFilterFamily(null);
                setFilterInbox(false);
              }}
              categories={getTripConfig(settings).categories}
              onSetVisitStatus={(id, status) => void setVisitStatus(id, status)}
              currencySymbol={currencyFromCountry(getTripConfig(settings).country)}
            />
            </>
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
              settings={settings}
              dayBriefing={activeDay ? getDayBriefing(activeDay) : ''}
              dayDescription={activeDay ? getDayDescription(activeDay) : ''}
              briefingLoading={briefingLoadingDay === activeDay}
              briefingError={briefingError?.dayIso === activeDay ? briefingError.message : null}
              onGenerateBriefing={handleGenerateBriefing}
              onAiAccept={(newPois, order, overview) => {
                for (const poi of newPois) void handleAddPoi(poi);
                if (activeDay) {
                  void setDayOrder(activeDay, order);
                  if (overview) void setDayDescription(activeDay, overview);
                }
              }}
              myFamilyId={myFamilyId}
              onAddPoi={handleAddPoi}
              dayBudget={activeDay ? getDayBudget(activeDay) : undefined}
              onSetDayBudget={(dayIso, b) => void setDayBudget(dayIso, b)}
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
              onSetTripConfig={(cfg) => void setTripConfig(cfg)}
              onMigrateFromLocal={workspace.migrateFromLocal}
              isAdmin={isAdmin}
              myFamilyId={myFamilyId}
              onMyFamilyChange={setMyFamilyId}
            />
          )}
        </div>
      </main>
      {tab !== 'settings' && (
        <AddPoiMenu
          families={settings.families}
          tripConfig={getTripConfig(settings)}
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
          onAdd={handleAddPoi}
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
          categories={getTripConfig(settings).categories}
          myFamilyId={myFamilyId}
          onAddComment={(poiId, familyId, text) => void addComment(poiId, familyId, text)}
          onRemoveComment={(poiId, commentId) => void removeComment(poiId, commentId)}
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
  if (!isFirebaseConfigured) return <FirebaseMissingNotice />;
  return (
    <AuthGate>
      {({ user }) => <AppInner user={user} />}
    </AuthGate>
  );
}

export default App;
