import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
let authReadyPromise: Promise<User> | null = null;

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
  });
  bundle = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    workspaceId: (env.VITE_FIREBASE_WORKSPACE_ID as string) || 'default',
  };
  return bundle;
}

/**
 * Ensures there is an anonymous auth session and resolves once we have a user.
 * Safe to call many times — returns the same promise.
 */
export function ensureAuth(): Promise<User> {
  if (authReadyPromise) return authReadyPromise;
  const { auth } = getFirebase();
  authReadyPromise = new Promise<User>((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      },
      (err) => {
        unsub();
        reject(err);
      },
    );
    // Kick off the anonymous sign-in if we're not already signed in
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        unsub();
        reject(err);
      });
    }
  });
  return authReadyPromise;
}
