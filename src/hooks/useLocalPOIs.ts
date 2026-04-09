import { useCallback, useEffect, useState } from 'react';
import { SEED_POIS, type POI } from '../data/pois';

const STORAGE_KEY = 'rhp:pois';

type LegacyPOI = Omit<POI, 'familyId' | 'createdAt'> & {
  family?: 'A' | 'B';
  familyId?: string;
  createdAt?: number;
};

function migrate(raw: unknown): POI[] {
  if (!Array.isArray(raw)) return SEED_POIS;
  const list = raw as LegacyPOI[];
  if (list.length === 0) return SEED_POIS;
  return list.map((p, idx) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    familyId:
      p.familyId ??
      (p.family === 'B' ? 'default-b' : 'default-a'),
    description: p.description,
    coords: p.coords,
    image: p.image,
    likes: p.likes ?? 0,
    instagramUrl: p.instagramUrl,
    placeId: p.placeId,
    needsLocation: p.needsLocation ?? !p.coords,
    createdAt: p.createdAt ?? Date.now() - idx * 1000,
  }));
}

function loadInitial(): POI[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return SEED_POIS;
    return migrate(JSON.parse(stored));
  } catch {
    return SEED_POIS;
  }
}

export function useLocalPOIs() {
  const [pois, setPois] = useState<POI[]>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pois));
    } catch {
      /* ignore */
    }
  }, [pois]);

  const addPoi = useCallback((poi: POI) => {
    setPois((prev) => [poi, ...prev]);
  }, []);

  const updatePoi = useCallback((id: string, patch: Partial<POI>) => {
    setPois((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const setLocation = useCallback(
    (
      id: string,
      coords: { lat: number; lng: number },
      placeId?: string,
    ) => {
      setPois((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, coords, placeId, needsLocation: false }
            : p,
        ),
      );
    },
    [],
  );

  const likePoi = useCallback((id: string) => {
    setPois((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)),
    );
  }, []);

  const removePoi = useCallback((id: string) => {
    setPois((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resetPois = useCallback(() => {
    setPois(SEED_POIS);
  }, []);

  return {
    pois,
    addPoi,
    updatePoi,
    setLocation,
    likePoi,
    removePoi,
    resetPois,
  };
}
