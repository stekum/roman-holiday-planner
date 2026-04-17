#!/usr/bin/env node
/**
 * Mint a Firebase Custom Token for the E2E test user + bootstrap the user
 * on first run. Output to stdout and .playwright-results/e2e-token.txt so
 * Playwright scripts can pick it up without stdio piping.
 *
 * Usage:
 *   node scripts/mint-e2e-token.mjs
 *
 * Requires a Firebase service account key. Set one of:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   # or place file at ./service-account.json (auto-detected, gitignored)
 *
 * Service account download:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const TEST_UID = 'e2e-test-user-1';
const TEST_EMAIL = 'e2e@roman-holidays.test';
const TEST_DISPLAY_NAME = 'E2E Test User';

function resolveServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const path = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!existsSync(path)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points to missing file: ${path}`);
    }
    return path;
  }
  const fallback = resolve(projectRoot, 'service-account.json');
  if (existsSync(fallback)) return fallback;
  throw new Error(
    'No Firebase service account found. Either set ' +
      'GOOGLE_APPLICATION_CREDENTIALS or place service-account.json in the ' +
      'project root. Download from: Firebase Console → Project Settings → ' +
      'Service Accounts → Generate new private key. See scripts/mint-e2e-token.mjs header.',
  );
}

async function ensureAuthUser(auth) {
  try {
    const existing = await auth.getUser(TEST_UID);
    // Patch missing fields (one-time heal)
    const patch = {};
    if (!existing.email) patch.email = TEST_EMAIL;
    if (!existing.displayName) patch.displayName = TEST_DISPLAY_NAME;
    if (!existing.emailVerified) patch.emailVerified = true;
    if (Object.keys(patch).length > 0) {
      await auth.updateUser(TEST_UID, patch);
      console.error(`[mint-e2e-token] patched auth user ${TEST_UID}:`, Object.keys(patch));
    }
    return existing;
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    console.error(`[mint-e2e-token] creating auth user ${TEST_UID}`);
    return auth.createUser({
      uid: TEST_UID,
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
      emailVerified: true,
    });
  }
}

async function ensureFirestoreProfile(db) {
  const ref = db.collection('users').doc(TEST_UID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`[mint-e2e-token] creating firestore profile ${TEST_UID}`);
    await ref.set({
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
      photoURL: null,
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      __e2eTestUser: true,
    });
    return;
  }
  const data = snap.data();
  if (data.status !== 'approved') {
    console.error(`[mint-e2e-token] patching status → approved for ${TEST_UID}`);
    await ref.update({ status: 'approved' });
  }
}

async function main() {
  const credPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const auth = admin.auth();
  const db = admin.firestore();

  await ensureAuthUser(auth);
  await ensureFirestoreProfile(db);

  const token = await auth.createCustomToken(TEST_UID);

  const outDir = resolve(projectRoot, '.playwright-results');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, 'e2e-token.txt');
  writeFileSync(outFile, token, 'utf8');
  console.error(`[mint-e2e-token] token written to ${outFile}`);

  // stdout: just the token, for piping
  process.stdout.write(token);
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error('[mint-e2e-token] FAILED:', err.message);
  process.exit(1);
});
