import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'rhp:active-workspace';
export const ENV_FALLBACK =
  (import.meta.env.VITE_FIREBASE_WORKSPACE_ID as string | undefined) || 'default';

export interface WorkspaceContextValue {
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function readInitialWorkspaceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.length > 0) return stored;
  } catch {
    /* SSR or privacy-mode Safari — ignore */
  }
  return ENV_FALLBACK;
}

export function useActiveWorkspaceId(): string {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      'useActiveWorkspaceId must be used inside <WorkspaceProvider>',
    );
  }
  return ctx.workspaceId;
}

export function useSetActiveWorkspaceId(): (id: string) => void {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      'useSetActiveWorkspaceId must be used inside <WorkspaceProvider>',
    );
  }
  return ctx.setWorkspaceId;
}
