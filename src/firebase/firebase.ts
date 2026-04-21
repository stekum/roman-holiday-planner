import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type AuthProvider,
  type User,
} from 'firebase/auth';
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

interface FirebaseBundle {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  workspaceId: string;
}

const env = import.meta.env;

export const isFirebaseConfigured = !!(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID
);

let bundle: FirebaseBundle | null = null;

export function getFirebase(): FirebaseBundle {
  if (bundle) return bundle;
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* in .env.local');
  }
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
    // #123: required for Firebase Analytics getAnalytics() to work client-side.
    // Missing here was why no GA events came through despite init succeeding.
    measurementId: env.VITE_GA_MEASUREMENT_ID as string | undefined,
  });
  const db = getFirestore(app);

  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn('[Firebase] Offline persistence failed:', err.code);
  });

  bundle = {
    app,
    auth: getAuth(app),
    db,
    workspaceId: (env.VITE_FIREBASE_WORKSPACE_ID as string) || 'default',
  };
  return bundle;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function watchAuth(cb: (user: User | null) => void): () => void {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, cb);
}

/**
 * Generic provider sign-in. Tries popup first (works on desktop + most
 * modern browsers) and falls back to redirect flow if the popup is
 * blocked or unavailable (iOS Safari, PWA standalone mode).
 */
async function signInWithProvider(provider: AuthProvider): Promise<void> {
  const { auth } = getFirebase();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const popupBlocked =
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment';
    if (popupBlocked) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export function signInWithGoogle(): Promise<void> {
  return signInWithProvider(new GoogleAuthProvider());
}

export function signInWithMicrosoft(): Promise<void> {
  const provider = new OAuthProvider('microsoft.com');
  // Request email + basic profile so we get displayName/photoURL.
  provider.addScope('email');
  provider.addScope('openid');
  provider.addScope('profile');
  return signInWithProvider(provider);
}

/**
 * Sign in with a Firebase Custom Token (E2E tests only).
 *
 * The token must be minted server-side via Firebase Admin SDK with a
 * valid service account. The only supported source is `scripts/mint-e2e-token.mjs`.
 * Clients cannot mint tokens themselves.
 */
export function signInWithE2EToken(token: string): Promise<void> {
  const { auth } = getFirebase();
  return signInWithCustomToken(auth, token).then(() => undefined);
}

/** Finalize a pending redirect sign-in (no-op if there is none). */
export async function consumeRedirectResult(): Promise<void> {
  const { auth } = getFirebase();
  try {
    await getRedirectResult(auth);
  } catch (err) {
    console.warn('[Firebase] redirect result failed:', err);
  }
}

export async function signOutUser(): Promise<void> {
  const { auth } = getFirebase();
  await signOut(auth);
}
