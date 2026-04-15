import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import { type POI, SEED_POIS, type Vote } from '../data/pois';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { Family, Homebase, Settings } from '../settings/types';
import type { TripPlan } from '../hooks/useTripPlan';

export type ConnectionStatus = 'connecting' | 'ready' | 'error';

interface WorkspaceDoc {
  settings: Settings;
  tripPlan: TripPlan;
  dayDescriptions: Record<string, string>; // ISO date → AI-generated overview text
  dayBriefings: Record<string, string>; // ISO date → AI-generated day briefing
}

export interface WorkspaceAPI {
  status: ConnectionStatus;
  error: string | null;

  // POIs
  pois: POI[];
  addPoi: (poi: POI) => Promise<void>;
  updatePoi: (id: string, patch: Partial<POI>) => Promise<void>;
  setLocation: (
    id: string,
    coords: { lat: number; lng: number },
    placeId?: string,
  ) => Promise<void>;
  likePoi: (id: string) => Promise<void>;
  votePoi: (id: string, familyId: string, vote: Vote) => Promise<void>;
  removePoi: (id: string) => Promise<void>;

  // Settings
  settings: Settings;
  setTripDates: (start: string, end: string) => Promise<void>;
  addFamily: (family: Omit<Family, 'id'>) => Promise<void>;
  updateFamily: (id: string, patch: Partial<Omit<Family, 'id'>>) => Promise<void>;
  removeFamily: (id: string) => Promise<void>;
  getFamily: (id: string) => Family | undefined;
  setHomebase: (hb: Homebase | undefined) => Promise<void>;

  // Trip plan
  plan: TripPlan;
  getDay: (dayIso: string) => string[];
  togglePoi: (dayIso: string, poiId: string) => Promise<void>;
  movePoi: (
    dayIso: string,
    poiId: string,
    direction: 'up' | 'down',
  ) => Promise<void>;
  setDayOrder: (dayIso: string, order: string[]) => Promise<void>;
  setDayDescription: (dayIso: string, description: string) => Promise<void>;
  getDayDescription: (dayIso: string) => string;
  setDayBriefing: (dayIso: string, briefing: string) => Promise<void>;
  getDayBriefing: (dayIso: string) => string;
  clearDay: (dayIso: string) => Promise<void>;
  removePoiFromAll: (poiId: string) => Promise<void>;

  // Bulk migration from localStorage
  migrateFromLocal: (data: {
    pois: POI[];
    settings: Settings;
    plan: TripPlan;
  }) => Promise<void>;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Realtime workspace hook — reads/writes a single shared Firestore doc
 * (settings + tripPlan) and a subcollection for POIs.
 *
 * Every device connects to the same workspace via VITE_FIREBASE_WORKSPACE_ID.
 * Writes are fire-and-forget: optimistic via Firestore's local cache, then
 * synced to the server. Realtime listeners stream changes back to all peers.
 */
export function useWorkspace(): WorkspaceAPI {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [doc_, setDoc_] = useState<WorkspaceDoc>({
    settings: DEFAULT_SETTINGS,
    tripPlan: {},
    dayDescriptions: {},
    dayBriefings: {},
  });

  // --- Subscribe on mount ---
  useEffect(() => {
    let cancelled = false;
    let unsubDoc: Unsubscribe | null = null;
    let unsubPois: Unsubscribe | null = null;

    const run = async () => {
      try {
        // Auth is guaranteed to be ready by AuthGate before this hook mounts.
        const { db, workspaceId } = getFirebase();
        if (cancelled) return;
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const poisRef = collection(db, 'workspaces', workspaceId, 'pois');

        unsubDoc = onSnapshot(
          workspaceRef,
          async (snap) => {
            if (cancelled) return;
            if (!snap.exists()) {
              // First visit ever — create the workspace with defaults
              await setDoc(workspaceRef, {
                settings: DEFAULT_SETTINGS,
                tripPlan: {},
                dayDescriptions: {},
                dayBriefings: {},
                createdAt: Date.now(),
              });
              return;
            }
            const data = snap.data() as Partial<WorkspaceDoc>;
            setDoc_({
              settings: data.settings ?? DEFAULT_SETTINGS,
              tripPlan: data.tripPlan ?? {},
              dayDescriptions: data.dayDescriptions ?? {},
              dayBriefings: data.dayBriefings ?? {},
            });
            setStatus('ready');
          },
          (err) => {
            if (cancelled) return;
            console.error('[Firestore] workspace doc listener error:', err);
            setError(err.message);
            setStatus('error');
          },
        );

        unsubPois = onSnapshot(
          poisRef,
          (snap) => {
            if (cancelled) return;
            const list: POI[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...(d.data() as Omit<POI, 'id'>) });
            });
            setPois(list);
          },
          (err) => {
            if (cancelled) return;
            console.error('[Firestore] pois listener error:', err);
            setError(err.message);
            setStatus('error');
          },
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[Firestore] setup error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    };

    run();

    return () => {
      cancelled = true;
      unsubDoc?.();
      unsubPois?.();
    };
  }, []);

  // --- Write helpers ---
  const workspaceDocRef = useCallback(() => {
    const { db, workspaceId } = getFirebase();
    return doc(db, 'workspaces', workspaceId);
  }, []);

  const poiDocRef = useCallback((id: string) => {
    const { db, workspaceId } = getFirebase();
    return doc(db, 'workspaces', workspaceId, 'pois', id);
  }, []);

  // --- POI operations ---
  const addPoi = useCallback(
    async (poi: POI) => {
      const { id, ...rest } = poi;
      await setDoc(poiDocRef(id), stripUndefined(rest as Record<string, unknown>));
    },
    [poiDocRef],
  );

  const updatePoi = useCallback(
    async (id: string, patch: Partial<POI>) => {
      // Firestore rejects `undefined`, normalize
      const clean = stripUndefined(patch as Record<string, unknown>);
      if (Object.keys(clean).length === 0) return;
      await updateDoc(poiDocRef(id), clean);
    },
    [poiDocRef],
  );

  const setLocation = useCallback(
    async (
      id: string,
      coords: { lat: number; lng: number },
      placeId?: string,
    ) => {
      const patch: Record<string, unknown> = {
        coords,
        needsLocation: false,
      };
      if (placeId !== undefined) patch.placeId = placeId;
      await updateDoc(poiDocRef(id), patch);
    },
    [poiDocRef],
  );

  const likePoi = useCallback(
    async (id: string) => {
      const current = pois.find((p) => p.id === id);
      if (!current) return;
      await updateDoc(poiDocRef(id), { likes: (current.likes ?? 0) + 1 });
    },
    [pois, poiDocRef],
  );

  const votePoi = useCallback(
    async (id: string, familyId: string, vote: Vote) => {
      if (!familyId) return;
      // Firestore dot-notation update — writes only the single field.
      // 'neutral' is still a valid value so users can "unvote" back to
      // the default without losing that they interacted.
      await updateDoc(poiDocRef(id), {
        [`votes.${familyId}`]: vote,
      });
    },
    [poiDocRef],
  );

  const removePoi = useCallback(
    async (id: string) => {
      await deleteDoc(poiDocRef(id));
      // Also clean out of trip plan
      const current = doc_.tripPlan;
      const nextPlan: TripPlan = {};
      for (const [day, ids] of Object.entries(current)) {
        nextPlan[day] = ids.filter((x) => x !== id);
      }
      await updateDoc(workspaceDocRef(), { tripPlan: nextPlan });
    },
    [poiDocRef, doc_, workspaceDocRef],
  );

  // --- Settings operations ---
  const setTripDates = useCallback(
    async (tripStart: string, tripEnd: string) => {
      await updateDoc(workspaceDocRef(), {
        'settings.tripStart': tripStart,
        'settings.tripEnd': tripEnd,
      });
    },
    [workspaceDocRef],
  );

  const addFamily = useCallback(
    async (family: Omit<Family, 'id'>) => {
      const nextFamilies = [
        ...doc_.settings.families,
        { ...family, id: `fam-${Date.now().toString(36)}` },
      ];
      await updateDoc(workspaceDocRef(), {
        'settings.families': nextFamilies,
      });
    },
    [doc_.settings.families, workspaceDocRef],
  );

  const updateFamily = useCallback(
    async (id: string, patch: Partial<Omit<Family, 'id'>>) => {
      const nextFamilies = doc_.settings.families.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      );
      await updateDoc(workspaceDocRef(), {
        'settings.families': nextFamilies,
      });
    },
    [doc_.settings.families, workspaceDocRef],
  );

  const removeFamily = useCallback(
    async (id: string) => {
      if (doc_.settings.families.length <= 1) return;
      const nextFamilies = doc_.settings.families.filter((f) => f.id !== id);
      await updateDoc(workspaceDocRef(), {
        'settings.families': nextFamilies,
      });
    },
    [doc_.settings.families, workspaceDocRef],
  );

  const getFamily = useCallback(
    (id: string) => doc_.settings.families.find((f) => f.id === id),
    [doc_.settings.families],
  );

  const setHomebase = useCallback(
    async (hb: Homebase | undefined) => {
      if (hb) {
        await updateDoc(workspaceDocRef(), {
          'settings.homebase': stripUndefined(hb as unknown as Record<string, unknown>),
        });
      } else {
        // Firestore doesn't have a "delete field" in updateDoc with dot notation,
        // so we rewrite the full settings without homebase.
        const next = { ...doc_.settings };
        delete next.homebase;
        await updateDoc(workspaceDocRef(), { settings: next });
      }
    },
    [doc_.settings, workspaceDocRef],
  );

  // --- Trip plan operations ---
  const getDay = useCallback(
    (dayIso: string) => doc_.tripPlan[dayIso] ?? [],
    [doc_.tripPlan],
  );

  const togglePoi = useCallback(
    async (dayIso: string, poiId: string) => {
      const current = doc_.tripPlan[dayIso] ?? [];
      const next = current.includes(poiId)
        ? current.filter((x) => x !== poiId)
        : [...current, poiId];
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: next,
      });
    },
    [doc_.tripPlan, workspaceDocRef],
  );

  const movePoi = useCallback(
    async (
      dayIso: string,
      poiId: string,
      direction: 'up' | 'down',
    ) => {
      const current = doc_.tripPlan[dayIso] ?? [];
      const idx = current.indexOf(poiId);
      if (idx === -1) return;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= current.length) return;
      const next = [...current];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: next,
      });
    },
    [doc_.tripPlan, workspaceDocRef],
  );

  const setDayOrder = useCallback(
    async (dayIso: string, order: string[]) => {
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: order,
      });
    },
    [workspaceDocRef],
  );

  const setDayDescription = useCallback(
    async (dayIso: string, description: string) => {
      await updateDoc(workspaceDocRef(), {
        [`dayDescriptions.${dayIso}`]: description,
      });
    },
    [workspaceDocRef],
  );

  const getDayDescription = useCallback(
    (dayIso: string) => doc_.dayDescriptions[dayIso] ?? '',
    [doc_.dayDescriptions],
  );

  const setDayBriefing = useCallback(
    async (dayIso: string, briefing: string) => {
      await updateDoc(workspaceDocRef(), {
        [`dayBriefings.${dayIso}`]: briefing,
      });
    },
    [workspaceDocRef],
  );

  const getDayBriefing = useCallback(
    (dayIso: string) => doc_.dayBriefings[dayIso] ?? '',
    [doc_.dayBriefings],
  );

  const clearDay = useCallback(
    async (dayIso: string) => {
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: [],
      });
    },
    [workspaceDocRef],
  );

  const removePoiFromAll = useCallback(
    async (poiId: string) => {
      const nextPlan: TripPlan = {};
      for (const [day, ids] of Object.entries(doc_.tripPlan)) {
        nextPlan[day] = ids.filter((x) => x !== poiId);
      }
      await updateDoc(workspaceDocRef(), { tripPlan: nextPlan });
    },
    [doc_.tripPlan, workspaceDocRef],
  );

  // --- Bulk migration ---
  const migrateFromLocal = useCallback(
    async (data: { pois: POI[]; settings: Settings; plan: TripPlan }) => {
      // Skip the seed POIs — if the local copy still has them unchanged they'd
      // be duplicated for everyone. We detect them by id.
      const seedIds = new Set(SEED_POIS.map((p) => p.id));
      const toWrite = data.pois.filter((p) => !seedIds.has(p.id));

      // Write POIs one by one — Firestore doesn't have a batch API in the
      // tree-shaken client we imported, but individual setDocs are fast.
      await Promise.all(
        toWrite.map(async (poi) => {
          const { id, ...rest } = poi;
          await setDoc(poiDocRef(id), stripUndefined(rest as Record<string, unknown>));
        }),
      );

      // Merge settings (families + tripDates) and tripPlan
      await updateDoc(workspaceDocRef(), {
        settings: data.settings,
        tripPlan: data.plan,
      });
    },
    [poiDocRef, workspaceDocRef],
  );

  return {
    status,
    error,
    pois,
    addPoi,
    updatePoi,
    setLocation,
    likePoi,
    votePoi,
    removePoi,
    settings: doc_.settings,
    setTripDates,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
    setHomebase,
    plan: doc_.tripPlan,
    getDay,
    togglePoi,
    movePoi,
    setDayOrder,
    setDayDescription,
    getDayDescription,
    setDayBriefing,
    getDayBriefing,
    clearDay,
    removePoiFromAll,
    migrateFromLocal,
  };
}
