/**
 * #227 — Default-Trip-Pin.
 *
 * Cross-device default workspace. Stored in users/{uid}.defaultWorkspaceId.
 * Bootstrap behavior:
 *   - Once per browser tab (sessionStorage marker), on first mount after
 *     auth, if a defaultWorkspaceId is set AND it differs from the current
 *     active workspace, switch to the default.
 *   - User-driven trip switches (TripSwitcher) update the active-workspace
 *     localStorage but do not touch the default — pinning is explicit.
 *
 * Failure modes:
 *   - Default points at a workspace the user lost access to → useWorkspace
 *     listener will get a permission-denied; UI handles via error state.
 *     We don't pre-validate here; the user can re-pin from the TripSwitcher.
 */

import { doc, setDoc, deleteField } from 'firebase/firestore';
import { getFirebase } from './firebase';

const BOOTSTRAP_MARKER = 'rhp:default-workspace-bootstrapped';

/** Has this tab already applied the default-workspace bootstrap once? */
export function wasDefaultBootstrapped(): boolean {
  try {
    return sessionStorage.getItem(BOOTSTRAP_MARKER) === '1';
  } catch {
    return false;
  }
}

/** Mark the bootstrap as done so we don't re-apply on every render. */
export function markDefaultBootstrapped(): void {
  try {
    sessionStorage.setItem(BOOTSTRAP_MARKER, '1');
  } catch {
    /* SSR / privacy mode — ignore */
  }
}

/**
 * Pin a workspace as the user's default. Caller must be authenticated.
 * Idempotent — re-pinning the same workspace is a no-op cost-wise.
 */
export async function pinDefaultWorkspace(workspaceId: string): Promise<void> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await setDoc(
    doc(db, 'users', uid),
    { defaultWorkspaceId: workspaceId },
    { merge: true },
  );
}

/** Unpin (clear) the default. Falls back to last-active behavior on next start. */
export async function unpinDefaultWorkspace(): Promise<void> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await setDoc(
    doc(db, 'users', uid),
    { defaultWorkspaceId: deleteField() },
    { merge: true },
  );
}
