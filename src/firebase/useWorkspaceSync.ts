import { useEffect, useRef } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { mergeRemoteIds } from './knownWorkspaces';
import type { UserProfile } from './useUserProfile';

/**
 * #113 Phase 1 — Cross-Device-Sync der Trip-Liste.
 *
 * Bridged `users/{uid}.workspaceIds` in Firestore und die lokale
 * {@link knownWorkspaces}-localStorage-Liste. Zwei Richtungen:
 *
 *  1. Remote → Local: Wenn Profil laedt oder sich aendert, werden
 *     fehlende Remote-IDs additiv in die lokale Liste gemerged. So sieht
 *     der User seine Trips auf neuen Devices, sobald das Profil fetcht.
 *
 *  2. Local → Remote: Wenn die aktive Workspace-ID wechselt oder das
 *     Profil ready wird, stellen wir sicher dass die Active-ID in
 *     `workspaceIds` steht. Firestore `arrayUnion` sorgt fuer Idempotenz
 *     und verhindert Race-Conditions zwischen mehreren Devices.
 *
 * Bewusst nicht synchronisiert: displayName-Aenderungen (bleiben
 * device-local) und forget-Operationen (additives-only-Merge, siehe
 * mergeRemoteIds).
 */
export function useWorkspaceSync(
  profile: UserProfile | null,
  activeWorkspaceId: string,
): void {
  // Track welche activeIds wir schon remote bestaetigt haben — vermeidet
  // redundante Firestore-Writes beim Re-Render.
  const writtenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    const remote = profile.workspaceIds ?? [];

    // Direction 1: Remote → Local
    mergeRemoteIds(remote);

    // Direction 2: Local → Remote
    if (!activeWorkspaceId) return;
    if (remote.includes(activeWorkspaceId)) return;
    if (writtenRef.current.has(activeWorkspaceId)) return;
    writtenRef.current.add(activeWorkspaceId);

    const { db } = getFirebase();
    updateDoc(doc(db, 'users', profile.uid), {
      workspaceIds: arrayUnion(activeWorkspaceId),
    }).catch((err) => {
      // Wenn der Write fehlschlaegt (Rules-Problem o.ae.), den Ref
      // zuruecknehmen, damit es beim naechsten Mount neu versucht wird.
      writtenRef.current.delete(activeWorkspaceId);
      console.warn('[useWorkspaceSync] failed to append workspaceId:', err);
    });
  }, [profile, activeWorkspaceId]);
}
