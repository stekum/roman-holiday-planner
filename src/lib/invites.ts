/**
 * #228 — Workspace invite tokens.
 *
 * Owner generates a token via createInvite(workspaceId) → writes invites/{token}
 * with a 7-day expiry. Recipient hits a URL with ?invite=<token>, the app
 * calls redeemInvite(token) which is a server-side Callable that atomically
 * adds the recipient to workspaces/{wsId}.memberIds.
 *
 * Token format: 32 chars [a-z0-9], generated client-side via crypto.getRandomValues.
 * Single-use, 7d TTL. Server enforces both via Firestore Rules + redeemInvite txn.
 */

import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebase } from '../firebase/firebase';

const TOKEN_LENGTH = 32;
const INVITE_TTL_DAYS = 7;
const URL_PARAM = 'invite';

/**
 * Generate a random unguessable token. 32 chars from [a-z0-9] gives
 * 36^32 ≈ 6.3 * 10^49 possibilities — collision-safe for our scale.
 */
function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Owner creates an invite. Returns the share URL the owner can copy.
 * Caller must be authenticated and the workspace owner — Firestore Rules
 * enforce both via isOwner(workspaceId) on the invites/{token} write.
 */
export async function createInvite(workspaceId: string): Promise<{
  token: string;
  url: string;
  expiresAt: Date;
}> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await setDoc(doc(db, 'invites', token), {
    workspaceId,
    createdBy: uid,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    used: false,
  });

  const url = `${window.location.origin}${window.location.pathname}?${URL_PARAM}=${token}`;
  return { token, url, expiresAt };
}

/**
 * Recipient redeems an invite. Calls the server-side `redeemInvite` Callable
 * which atomically validates the token + adds caller to memberIds.
 *
 * Throws Error with .code matching the HttpsError codes from functions/index.js:
 *   'unauthenticated', 'failed-precondition', 'not-found',
 *   'already-exists', 'deadline-exceeded', 'invalid-argument'.
 */
export async function redeemInvite(token: string): Promise<{ workspaceId: string }> {
  const { functions } = getFirebase();
  const callable = httpsCallable<{ token: string }, { workspaceId: string }>(
    functions,
    'redeemInvite',
  );
  const result = await callable({ token });
  return result.data;
}

/**
 * Read the invite token from the current URL (query param `?invite=<token>`).
 * Does NOT remove the param — caller decides when to clear it.
 */
export function readInviteFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get(URL_PARAM);
  if (!token) return null;
  // Reject malformed tokens early — saves a server round-trip.
  if (!/^[a-z0-9]{32}$/.test(token)) return null;
  return token;
}

/**
 * Remove the invite param from the URL without reload, after the token has
 * been consumed (success or failure). Keeps any other query params.
 */
export function clearInviteFromURL(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM);
  window.history.replaceState({}, '', url.toString());
}
