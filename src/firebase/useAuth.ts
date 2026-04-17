import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  consumeRedirectResult,
  isFirebaseConfigured,
  signInWithE2EToken,
  watchAuth,
} from './firebase';

const E2E_TOKEN_KEY = 'rhp:e2e-token';

/**
 * Check for an E2E test token in sessionStorage and sign in with it.
 * Only triggered by Playwright via `addInitScript` — not via URL or UI.
 * Token is consumed (removed from storage) before sign-in to prevent
 * re-use across reloads.
 */
async function consumeE2EToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  const token = window.sessionStorage.getItem(E2E_TOKEN_KEY);
  if (!token) return;
  window.sessionStorage.removeItem(E2E_TOKEN_KEY);
  try {
    await signInWithE2EToken(token);
  } catch (err) {
    console.error('[useAuth] E2E sign-in failed:', err);
  }
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

/**
 * Observes Firebase auth state. Handles the redirect-flow result on mount so
 * users returning from an OAuth redirect land directly in the signed-in state.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    status: isFirebaseConfigured ? 'loading' : 'signed-out',
    user: null,
  }));

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    void consumeE2EToken();
    void consumeRedirectResult();

    const unsub = watchAuth((user) => {
      setState({
        status: user ? 'signed-in' : 'signed-out',
        user,
      });
    });

    return unsub;
  }, []);

  return state;
}
