import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { isAdminUser, isPreApprovedEmail } from './adminConfig';
import { getFirebase } from './firebase';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  status: UserStatus;
  createdAt?: number;
}

export type ProfileLoadState = 'loading' | 'ready' | 'error';

export interface ProfileState {
  state: ProfileLoadState;
  profile: UserProfile | null;
  error: string | null;
}

type InternalState =
  | { kind: 'idle' }
  | { kind: 'ready'; profile: UserProfile }
  | { kind: 'error'; error: string };

/**
 * On first sign-in, creates `users/{uid}` with status 'pending'.
 * Subscribes to the document so status changes propagate live (e.g. when
 * the admin approves the user).
 */
export function useUserProfile(user: User | null): ProfileState {
  const [internal, setInternal] = useState<InternalState>({ kind: 'idle' });

  useEffect(() => {
    if (!user) {
      return;
    }

    const { db } = getFirebase();
    const ref = doc(db, 'users', user.uid);

    let initialised = false;

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          if (initialised) return;
          initialised = true;
          try {
            // Admin and pre-approved emails skip the approval queue — admin
            // so they can bootstrap it, pre-approved emails so trusted family
            // members don't have to wait when the admin is offline.
            const initialStatus =
              isAdminUser(user.email) || isPreApprovedEmail(user.email)
                ? 'approved'
                : 'pending';
            await setDoc(ref, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              status: initialStatus,
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            console.error('[useUserProfile] create failed:', err);
            setInternal({ kind: 'error', error: (err as Error).message });
          }
          return;
        }

        const data = snap.data();

        // Self-heal: if the stored doc is missing profile fields but the
        // Firebase user object has them (race on first sign-in, or the user
        // re-auths later with a provider that now returns more info), patch
        // the doc so the Approval-Queue UI can show proper identifiers
        // instead of "?".
        const patch: Record<string, unknown> = {};
        if (user.email && !data.email) patch.email = user.email;
        if (user.displayName && !data.displayName) patch.displayName = user.displayName;
        if (user.photoURL && !data.photoURL) patch.photoURL = user.photoURL;
        if (Object.keys(patch).length > 0) {
          void updateDoc(ref, patch).catch((err) => {
            console.warn('[useUserProfile] self-heal failed:', err);
          });
        }

        setInternal({
          kind: 'ready',
          profile: {
            uid: user.uid,
            email: data.email ?? user.email,
            displayName: data.displayName ?? user.displayName,
            photoURL: data.photoURL ?? user.photoURL,
            status: (data.status as UserStatus) ?? 'pending',
            createdAt: (data.createdAt as { toMillis?: () => number })?.toMillis?.(),
          },
        });
      },
      (err: FirestoreError) => {
        console.error('[useUserProfile] listener error:', err);
        setInternal({ kind: 'error', error: err.message });
      },
    );

    return unsub;
  }, [user]);

  // Derive the public ProfileState from the current user + internal fetch
  // state. No setState-in-effect needed — when the user is null we directly
  // return a ready/empty state; otherwise the effect drives internal state.
  if (!user) {
    return { state: 'ready', profile: null, error: null };
  }
  if (internal.kind === 'ready') {
    return { state: 'ready', profile: internal.profile, error: null };
  }
  if (internal.kind === 'error') {
    return { state: 'error', profile: null, error: internal.error };
  }
  return { state: 'loading', profile: null, error: null };
}
