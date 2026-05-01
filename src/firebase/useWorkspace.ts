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
import { useActiveWorkspaceId } from './workspaceContext';
import { rememberWorkspace } from './knownWorkspaces';
import { primeEnrichmentCache } from '../lib/placesNewApi';
import { type POI, SEED_POIS, type Vote, type Comment, type VisitStatus } from '../data/pois';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { ActivityEvent, Family, Homebase, Settings, TransitDay, TripConfig } from '../settings/types';
import {
  query as fsQuery,
  orderBy as fsOrderBy,
  limit as fsLimit,
  serverTimestamp,
} from 'firebase/firestore';
import type { TripPlan } from '../hooks/useTripPlan';

export type ConnectionStatus = 'connecting' | 'ready' | 'error' | 'no-membership';

/**
 * #254: Erkennt einen "permission-denied" Firestore-Error — das passiert
 * legitim bei Erstanmeldern die noch keinem Workspace beigetreten sind.
 * NICHT als Connectivity-Fehler behandeln (sonst irritierender roter Banner).
 */
function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === 'permission-denied';
}

export interface DayBudget {
  /** Tagesbudget (Zielwert). */
  budget: number;
  /** Bisher ausgegeben (manuell). */
  spent: number;
}

interface WorkspaceDoc {
  settings: Settings;
  tripPlan: TripPlan;
  dayDescriptions: Record<string, string>; // ISO date → AI-generated overview text
  dayBriefings: Record<string, string>; // ISO date → AI-generated day briefing
  dayBudgets: Record<string, DayBudget>; // ISO date → {budget, spent} (#48)
  postTripAnalysis: string; // AI-generated summary von was beim naechsten Trip zu tun ist (#43)
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
  addComment: (poiId: string, familyId: string, text: string) => Promise<void>;
  removeComment: (poiId: string, commentId: string) => Promise<void>;
  setVisitStatus: (poiId: string, status: VisitStatus | null) => Promise<void>;
  removePoi: (id: string) => Promise<void>;

  // Settings
  settings: Settings;
  setTripDates: (start: string, end: string) => Promise<void>;
  addFamily: (family: Omit<Family, 'id'>) => Promise<void>;
  updateFamily: (id: string, patch: Partial<Omit<Family, 'id'>>) => Promise<void>;
  removeFamily: (id: string) => Promise<void>;
  getFamily: (id: string) => Family | undefined;
  setHomebase: (hb: Homebase | undefined) => Promise<void>;
  setHomebases: (list: Homebase[]) => Promise<void>;
  setTransitDays: (list: TransitDay[]) => Promise<void>;
  setTripConfig: (cfg: TripConfig) => Promise<void>;
  setHomeCurrency: (code: string) => Promise<void>;
  setHomeTimezone: (tz: string) => Promise<void>;
  setInsurance: (data: { name?: string; phone?: string; policyNumber?: string }) => Promise<void>;

  // Activity-Feed (#50)
  activity: ActivityEvent[];

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
  setDayBudget: (dayIso: string, budget: DayBudget) => Promise<void>;
  getDayBudget: (dayIso: string) => DayBudget | undefined;
  setPostTripAnalysis: (analysis: string) => Promise<void>;
  postTripAnalysis: string;
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

const EMPTY_DOC: WorkspaceDoc = {
  settings: DEFAULT_SETTINGS,
  tripPlan: {},
  dayDescriptions: {},
  dayBriefings: {},
  dayBudgets: {},
  postTripAnalysis: '',
};

/**
 * Realtime workspace hook — reads/writes the active workspace's Firestore doc
 * (settings + tripPlan) and its POI subcollection.
 *
 * The active workspaceId comes from {@link useActiveWorkspaceId}. When it
 * changes (trip-switch via #70), all listeners are torn down, local state is
 * reset, and new listeners attach to the new workspace's paths.
 *
 * Writes are fire-and-forget: optimistic via Firestore's local cache, then
 * synced to the server. Realtime listeners stream changes back to all peers.
 */
export function useWorkspace(): WorkspaceAPI {
  const workspaceId = useActiveWorkspaceId();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [doc_, setDoc_] = useState<WorkspaceDoc>(EMPTY_DOC);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  // --- Subscribe on workspace change ---
  useEffect(() => {
    let cancelled = false;
    let unsubDoc: Unsubscribe | null = null;
    let unsubPois: Unsubscribe | null = null;
    let unsubActivity: Unsubscribe | null = null;

    // Reset state synchronously so consumers don't see stale data from the
    // previous workspace while the new listeners warm up.
    setStatus('connecting');
    setError(null);
    setPois([]);
    setDoc_(EMPTY_DOC);
    setActivity([]);

    const run = async () => {
      try {
        // Auth is guaranteed to be ready by AuthGate before this hook mounts.
        const { db, auth } = getFirebase();
        if (cancelled) return;
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const poisRef = collection(db, 'workspaces', workspaceId, 'pois');

        unsubDoc = onSnapshot(
          workspaceRef,
          async (snap) => {
            if (cancelled) return;
            if (!snap.exists()) {
              // First visit ever — create the workspace with defaults.
              // Creator becomes owner + first member (#228).
              const creatorUid = auth.currentUser?.uid;
              if (!creatorUid) {
                console.warn('[useWorkspace] auto-create skipped: no auth user');
                return;
              }
              await setDoc(workspaceRef, {
                ownerUid: creatorUid,
                memberIds: [creatorUid],
                settings: DEFAULT_SETTINGS,
                tripPlan: {},
                dayDescriptions: {},
                dayBriefings: {},
                dayBudgets: {},
                postTripAnalysis: '',
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
              dayBudgets: data.dayBudgets ?? {},
              postTripAnalysis: data.postTripAnalysis ?? '',
            });
            rememberWorkspace(workspaceId);
            setStatus('ready');
          },
          (err) => {
            if (cancelled) return;
            // #254: permission-denied bei Erstanmeldern ist legitim, kein
            // Connectivity-Bug. Eigener Status für freundlichen Hinweis.
            if (isPermissionDenied(err)) {
              console.info('[Firestore] no membership yet for workspace:', workspaceId);
              setError(null);
              setStatus('no-membership');
              return;
            }
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
              const poi = { id: d.id, ...(d.data() as Omit<POI, 'id'>) };
              list.push(poi);
              // #179: Firestore-enrichment als Session-Cache primen,
              // damit Components nicht ueber die Places-API re-fetchen.
              primeEnrichmentCache(poi.placeId, {
                aiSummary: poi.aiSummary,
                priceRange: poi.priceRange,
                primaryType: poi.primaryType,
                primaryTypeDisplayName: poi.primaryTypeDisplayName,
              });
            });
            setPois(list);
          },
          (err) => {
            if (cancelled) return;
            // #254: permission-denied = noch kein Member. Nicht als Bug zeigen.
            if (isPermissionDenied(err)) {
              console.info('[Firestore] pois: no membership yet:', workspaceId);
              setError(null);
              setStatus('no-membership');
              return;
            }
            console.error('[Firestore] pois listener error:', err);
            setError(err.message);
            setStatus('error');
          },
        );

        // #50: Activity-Feed Subscription — letzte 50 Events, neueste zuerst
        const activityRef = collection(db, 'workspaces', workspaceId, 'activity');
        unsubActivity = onSnapshot(
          fsQuery(activityRef, fsOrderBy('createdAt', 'desc'), fsLimit(50)),
          (snap) => {
            if (cancelled) return;
            const list: ActivityEvent[] = [];
            snap.forEach((d) => {
              const data = d.data() as Omit<ActivityEvent, 'id'>;
              // serverTimestamp() ist initial null bis Server-Roundtrip
              const ts =
                typeof data.createdAt === 'number'
                  ? data.createdAt
                  : (data.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ??
                    Date.now();
              list.push({ ...data, id: d.id, createdAt: ts });
            });
            setActivity(list);
          },
          (err) => {
            // Activity-Feed ist nicht kritisch — silently ignorieren falls Permission/Index fehlt
            if (cancelled) return;
            console.warn('[Firestore] activity listener error (non-critical):', err);
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
      unsubActivity?.();
    };
  }, [workspaceId]);

  // --- Write helpers ---
  const workspaceDocRef = useCallback(() => {
    const { db } = getFirebase();
    return doc(db, 'workspaces', workspaceId);
  }, [workspaceId]);

  const poiDocRef = useCallback(
    (id: string) => {
      const { db } = getFirebase();
      return doc(db, 'workspaces', workspaceId, 'pois', id);
    },
    [workspaceId],
  );

  // --- POI operations ---
  // #50: Activity-Logger — fire-and-forget, schluckt Fehler (Activity ist nicht kritisch)
  const logActivity = useCallback(
    (event: Omit<ActivityEvent, 'id' | 'createdAt' | 'userId' | 'userLabel'>) => {
      try {
        const { db, auth } = getFirebase();
        const user = auth.currentUser;
        if (!user) return;
        const activityRef = collection(db, 'workspaces', workspaceId, 'activity');
        const newId = doc(activityRef).id;
        const docRef = doc(db, 'workspaces', workspaceId, 'activity', newId);
        const payload = stripUndefined({
          ...event,
          userId: user.uid,
          userLabel: user.displayName || user.email || user.uid.slice(0, 6),
          createdAt: serverTimestamp(),
        } as unknown as Record<string, unknown>);
        void setDoc(docRef, payload).catch((err) => {
          console.warn('[Activity] log failed:', err);
        });
      } catch (err) {
        console.warn('[Activity] logger setup failed:', err);
      }
    },
    [workspaceId],
  );

  const addPoi = useCallback(
    async (poi: POI) => {
      const { id, ...rest } = poi;
      await setDoc(poiDocRef(id), stripUndefined(rest as Record<string, unknown>));
      logActivity({ type: 'poi_added', poiId: id, poiTitle: poi.title });
    },
    [poiDocRef, logActivity],
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
      await updateDoc(poiDocRef(id), {
        [`votes.${familyId}`]: vote,
      });
      const title = pois.find((p) => p.id === id)?.title;
      logActivity({ type: 'poi_voted', poiId: id, poiTitle: title, detail: vote });
    },
    [poiDocRef, pois, logActivity],
  );

  const addComment = useCallback(
    async (poiId: string, familyId: string, text: string) => {
      const trimmed = text.trim();
      if (!familyId || !trimmed) return;
      const current = pois.find((p) => p.id === poiId);
      if (!current) return;
      const comment: Comment = {
        id: `c-${Date.now().toString(36)}`,
        familyId,
        text: trimmed,
        createdAt: Date.now(),
      };
      const next = [...(current.comments ?? []), comment];
      await updateDoc(poiDocRef(poiId), { comments: next });
    },
    [pois, poiDocRef],
  );

  const removeComment = useCallback(
    async (poiId: string, commentId: string) => {
      const current = pois.find((p) => p.id === poiId);
      if (!current?.comments) return;
      const next = current.comments.filter((c) => c.id !== commentId);
      await updateDoc(poiDocRef(poiId), { comments: next });
    },
    [pois, poiDocRef],
  );

  const setVisitStatus = useCallback(
    async (poiId: string, status: VisitStatus | null) => {
      // null => unset (store deleteField-equivalent via writing null, then
      // UI treats null/undefined identically). Simpler than deleteField()
      // and avoids the extra import. Firestore accepts null as value.
      await updateDoc(poiDocRef(poiId), { visitStatus: status });
    },
    [poiDocRef],
  );

  const removePoi = useCallback(
    async (id: string) => {
      const removedTitle = pois.find((p) => p.id === id)?.title;
      await deleteDoc(poiDocRef(id));
      // Also clean out of trip plan
      const current = doc_.tripPlan;
      const nextPlan: TripPlan = {};
      for (const [day, ids] of Object.entries(current)) {
        nextPlan[day] = ids.filter((x) => x !== id);
      }
      await updateDoc(workspaceDocRef(), { tripPlan: nextPlan });
      logActivity({ type: 'poi_removed', poiId: id, poiTitle: removedTitle });
    },
    [poiDocRef, doc_, workspaceDocRef, pois, logActivity],
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

  /**
   * Multi-Homebase-Bulk-Setter (#74). Schreibt die komplette Liste atomar
   * in `settings.homebases` und räumt gleichzeitig das Legacy-Feld
   * `settings.homebase` weg, damit der Resolver nicht doppelt liest.
   * Leere Liste = alle Homebases entfernen.
   */
  const setHomebases = useCallback(
    async (list: Homebase[]) => {
      const cleaned = list.map((hb) =>
        stripUndefined(hb as unknown as Record<string, unknown>),
      );
      // settings.homebase (legacy) aktiv "leeren" durch vollen Settings-
      // Rewrite — Firestore kennt kein deleteField via dot-notation.
      const next = { ...doc_.settings, homebases: cleaned } as Record<string, unknown>;
      delete next.homebase;
      await updateDoc(workspaceDocRef(), { settings: next });
    },
    [doc_.settings, workspaceDocRef],
  );

  const setTransitDays = useCallback(
    async (list: TransitDay[]) => {
      const cleaned = list.map((t) =>
        stripUndefined(t as unknown as Record<string, unknown>),
      );
      await updateDoc(workspaceDocRef(), {
        'settings.transitDays': cleaned,
      });
    },
    [workspaceDocRef],
  );

  const setTripConfig = useCallback(
    async (cfg: TripConfig) => {
      await updateDoc(workspaceDocRef(), {
        'settings.tripConfig': stripUndefined(cfg as unknown as Record<string, unknown>),
      });
    },
    [workspaceDocRef],
  );

  const setHomeCurrency = useCallback(
    async (code: string) => {
      await updateDoc(workspaceDocRef(), {
        'settings.homeCurrency': code,
      });
    },
    [workspaceDocRef],
  );

  const setHomeTimezone = useCallback(
    async (tz: string) => {
      await updateDoc(workspaceDocRef(), {
        'settings.homeTimezone': tz,
      });
    },
    [workspaceDocRef],
  );

  const setInsurance = useCallback(
    async (data: { name?: string; phone?: string; policyNumber?: string }) => {
      await updateDoc(workspaceDocRef(), {
        'settings.insurance': stripUndefined(data as unknown as Record<string, unknown>),
      });
    },
    [workspaceDocRef],
  );

  // --- Trip plan operations ---
  const getDay = useCallback(
    (dayIso: string) => doc_.tripPlan[dayIso] ?? [],
    [doc_.tripPlan],
  );

  const togglePoi = useCallback(
    async (dayIso: string, poiId: string) => {
      const current = doc_.tripPlan[dayIso] ?? [];
      const wasIncluded = current.includes(poiId);
      const next = wasIncluded
        ? current.filter((x) => x !== poiId)
        : [...current, poiId];
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: next,
      });
      const title = pois.find((p) => p.id === poiId)?.title;
      logActivity({
        type: wasIncluded ? 'poi_unplanned' : 'poi_planned',
        poiId,
        poiTitle: title,
        dayIso,
      });
    },
    [doc_.tripPlan, workspaceDocRef, pois, logActivity],
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

  const setDayBudget = useCallback(
    async (dayIso: string, budget: DayBudget) => {
      await updateDoc(workspaceDocRef(), {
        [`dayBudgets.${dayIso}`]: {
          budget: Number.isFinite(budget.budget) ? budget.budget : 0,
          spent: Number.isFinite(budget.spent) ? budget.spent : 0,
        },
      });
    },
    [workspaceDocRef],
  );

  const getDayBudget = useCallback(
    (dayIso: string) => doc_.dayBudgets[dayIso],
    [doc_.dayBudgets],
  );

  const setPostTripAnalysis = useCallback(
    async (analysis: string) => {
      await updateDoc(workspaceDocRef(), {
        postTripAnalysis: analysis,
      });
    },
    [workspaceDocRef],
  );

  const clearDay = useCallback(
    async (dayIso: string) => {
      await updateDoc(workspaceDocRef(), {
        [`tripPlan.${dayIso}`]: [],
        [`dayBriefings.${dayIso}`]: '',
        [`dayDescriptions.${dayIso}`]: '',
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
    addComment,
    removeComment,
    setVisitStatus,
    removePoi,
    settings: doc_.settings,
    setTripDates,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
    setHomebase,
    setHomebases,
    setTransitDays,
    setTripConfig,
    setHomeCurrency,
    setHomeTimezone,
    setInsurance,
    activity,
    plan: doc_.tripPlan,
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
    setPostTripAnalysis,
    postTripAnalysis: doc_.postTripAnalysis,
    clearDay,
    removePoiFromAll,
    migrateFromLocal,
  };
}
