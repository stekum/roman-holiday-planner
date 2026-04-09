import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'rhp:tripplan';

export type TripPlan = Record<string, string[]>; // ISO date → ordered POI ids

function loadInitial(): TripPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as TripPlan;
    }
    return {};
  } catch {
    return {};
  }
}

export function useTripPlan() {
  const [plan, setPlan] = useState<TripPlan>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      /* ignore */
    }
  }, [plan]);

  const getDay = useCallback(
    (dayIso: string): string[] => plan[dayIso] ?? [],
    [plan],
  );

  const togglePoi = useCallback((dayIso: string, poiId: string) => {
    setPlan((prev) => {
      const current = prev[dayIso] ?? [];
      const next = current.includes(poiId)
        ? current.filter((id) => id !== poiId)
        : [...current, poiId];
      return { ...prev, [dayIso]: next };
    });
  }, []);

  const movePoi = useCallback(
    (dayIso: string, poiId: string, direction: 'up' | 'down') => {
      setPlan((prev) => {
        const current = prev[dayIso] ?? [];
        const idx = current.indexOf(poiId);
        if (idx === -1) return prev;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= current.length) return prev;
        const next = [...current];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        return { ...prev, [dayIso]: next };
      });
    },
    [],
  );

  const clearDay = useCallback((dayIso: string) => {
    setPlan((prev) => ({ ...prev, [dayIso]: [] }));
  }, []);

  const removePoiFromAll = useCallback((poiId: string) => {
    setPlan((prev) => {
      const next: TripPlan = {};
      for (const [day, ids] of Object.entries(prev)) {
        next[day] = ids.filter((id) => id !== poiId);
      }
      return next;
    });
  }, []);

  /** Zählt in wievielen Tagen der POI vorkommt. */
  const countDaysForPoi = useCallback(
    (poiId: string): number =>
      Object.values(plan).filter((ids) => ids.includes(poiId)).length,
    [plan],
  );

  return {
    plan,
    getDay,
    togglePoi,
    movePoi,
    clearDay,
    removePoiFromAll,
    countDaysForPoi,
  };
}
