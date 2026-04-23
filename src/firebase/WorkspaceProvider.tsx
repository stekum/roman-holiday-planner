import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  STORAGE_KEY,
  WorkspaceContext,
  readInitialWorkspaceId,
} from './workspaceContext';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<string>(() =>
    readInitialWorkspaceId(),
  );

  const setWorkspaceId = useCallback((next: string) => {
    if (!next) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore — state-only fallback */
    }
    setWorkspaceIdState(next);
  }, []);

  const value = useMemo(
    () => ({ workspaceId, setWorkspaceId }),
    [workspaceId, setWorkspaceId],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
