/**
 * Per-device registry of workspaces this browser has seen or created. Feeds
 * the TripSwitcher dropdown in the header.
 *
 * Storage only — cross-device sync comes later via user-profile
 * (#113: Auth User-Profil + Workspace-Zuordnung). Until then, a new device
 * starts with just the env-fallback workspace and accumulates entries as the
 * user opens / creates trips.
 */

const STORAGE_KEY = 'rhp:known-workspaces';
const ENV_FALLBACK =
  (import.meta.env.VITE_FIREBASE_WORKSPACE_ID as string | undefined) || 'default';

export interface KnownWorkspace {
  /** Firestore workspace document id — also the `rhp:active-workspace` value. */
  id: string;
  /** Optional human label. Falls back to {@link id} in UI. */
  displayName?: string;
  /** Last time this workspace was the active one on this device (epoch ms). */
  lastOpened: number;
}

export const WORKSPACE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isValidWorkspaceId(id: string): boolean {
  return WORKSPACE_ID_PATTERN.test(id);
}

function readRaw(): KnownWorkspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is KnownWorkspace =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as KnownWorkspace).id === 'string' &&
        typeof (e as KnownWorkspace).lastOpened === 'number',
    );
  } catch {
    return [];
  }
}

function writeRaw(list: KnownWorkspace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore — state-only fallback */
  }
}

/**
 * Returns the list of known workspaces, sorted by {@link KnownWorkspace.lastOpened}
 * desc. If no entries exist yet, seeds the env-fallback id so the UI always
 * has at least the current workspace visible.
 */
export function getKnownWorkspaces(): KnownWorkspace[] {
  const list = readRaw();
  if (list.length === 0) {
    const seed: KnownWorkspace = { id: ENV_FALLBACK, lastOpened: Date.now() };
    writeRaw([seed]);
    return [seed];
  }
  return [...list].sort((a, b) => b.lastOpened - a.lastOpened);
}

/**
 * Adds or updates an entry. Bumps {@link KnownWorkspace.lastOpened} to now.
 * If {@link displayName} is provided it overwrites any existing label;
 * undefined keeps the existing label untouched.
 */
export function rememberWorkspace(id: string, displayName?: string): void {
  if (!id) return;
  const list = readRaw();
  const existingIdx = list.findIndex((e) => e.id === id);
  const now = Date.now();
  if (existingIdx >= 0) {
    const prev = list[existingIdx];
    list[existingIdx] = {
      ...prev,
      displayName: displayName !== undefined ? displayName : prev.displayName,
      lastOpened: now,
    };
  } else {
    list.push({ id, displayName, lastOpened: now });
  }
  writeRaw(list);
}

/** Removes a workspace from the local registry (does NOT delete Firestore data). */
export function forgetWorkspace(id: string): void {
  const list = readRaw().filter((e) => e.id !== id);
  writeRaw(list);
}

/**
 * Merged eine Remote-Liste von Workspace-IDs (aus `users/{uid}.workspaceIds`)
 * additiv in die lokale Known-Liste. Neue IDs bekommen einen Platzhalter-
 * Eintrag ohne displayName (fallback auf ID in UI). Bestehende Einträge
 * bleiben unangetastet — insbesondere ihre Display-Namen und lastOpened-
 * Timestamps.
 *
 * Bewusst **additiv-only**: wir löschen keine lokalen Einträge die nicht
 * in remote stehen. Sonst würde ein User der auf Device B einen Trip
 * forgetet hat, ihn beim Öffnen von Device A versehentlich wieder
 * mitnehmen (Device A hat den Trip in seiner localStorage noch drin).
 *
 * Returns true wenn mindestens ein Eintrag neu hinzugefuegt wurde.
 */
export function mergeRemoteIds(remoteIds: readonly string[]): boolean {
  if (remoteIds.length === 0) return false;
  const list = readRaw();
  const localIds = new Set(list.map((e) => e.id));
  const now = Date.now();
  let added = false;
  for (const id of remoteIds) {
    if (!id || localIds.has(id)) continue;
    list.push({ id, lastOpened: now });
    added = true;
  }
  if (added) writeRaw(list);
  return added;
}

/**
 * Updates just the display name without bumping {@link KnownWorkspace.lastOpened}.
 * Empty string clears the name. Silently no-ops if the id is not known.
 */
export function renameWorkspace(id: string, displayName: string): void {
  const list = readRaw();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const trimmed = displayName.trim();
  list[idx] = {
    ...list[idx],
    displayName: trimmed.length > 0 ? trimmed : undefined,
  };
  writeRaw(list);
}
