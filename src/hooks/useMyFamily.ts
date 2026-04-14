import { useCallback, useState } from 'react';
import type { Family } from '../settings/types';

const STORAGE_KEY = 'rhp:myFamilyId';

function loadStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Tracks which family the current device "is" — used for voting and
 * potentially other per-family actions. Stored in localStorage (per
 * device, not per user account) so Stefan on his phone can vote as one
 * family while his partner on another phone votes as the other.
 *
 * If the stored family doesn't exist in the given list (e.g. first visit
 * or after a family was removed), we fall back to the first one — but
 * without writing state in an effect, the derived value is computed on
 * every render.
 */
export function useMyFamily(families: Family[]): {
  myFamilyId: string;
  setMyFamilyId: (id: string) => void;
} {
  const [stored, setStored] = useState<string>(loadStored);

  const exists = stored && families.some((f) => f.id === stored);
  const myFamilyId = exists ? stored : families[0]?.id ?? '';

  const setMyFamilyId = useCallback((id: string) => {
    setStored(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  return { myFamilyId, setMyFamilyId };
}
