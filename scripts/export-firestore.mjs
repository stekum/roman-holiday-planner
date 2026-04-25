#!/usr/bin/env node
/**
 * Full Firestore export for #228 hard-reset backup.
 *
 * Read-only. Dumps every workspaces/* (incl. pois subcollection),
 * users/*, and any top-level invites/* into a single JSON file.
 *
 * Output: /tmp/firestore-backup-<project>-<isodate>.json (default)
 *         or path passed as first arg.
 *
 * Usage:
 *   node scripts/export-firestore.mjs
 *   node scripts/export-firestore.mjs /path/to/backup.json
 *
 * Restore is intentionally NOT automated. If anything is needed back,
 * load the JSON manually and re-create via Admin SDK or the app UI.
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or ./service-account.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

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
    'No Firebase service account found. Set GOOGLE_APPLICATION_CREDENTIALS ' +
      'or place service-account.json in the project root.',
  );
}

/**
 * Convert Firestore values into plain JSON. Timestamps become ISO strings;
 * GeoPoints become {lat, lng}; DocumentReferences become path strings.
 * Recurses into objects and arrays.
 */
function serializeValue(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof admin.firestore.Timestamp) {
    return { __type: 'timestamp', iso: v.toDate().toISOString() };
  }
  if (v instanceof admin.firestore.GeoPoint) {
    return { __type: 'geopoint', lat: v.latitude, lng: v.longitude };
  }
  if (v instanceof admin.firestore.DocumentReference) {
    return { __type: 'docref', path: v.path };
  }
  if (Array.isArray(v)) return v.map(serializeValue);
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = serializeValue(val);
    return out;
  }
  return v;
}

async function exportCollection(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  const docs = {};
  for (const doc of snap.docs) {
    docs[doc.id] = serializeValue(doc.data());
  }
  return docs;
}

async function exportWorkspacesWithPois(db) {
  const snap = await db.collection('workspaces').get();
  const out = {};
  for (const doc of snap.docs) {
    const data = serializeValue(doc.data() ?? {});
    const poiSnap = await doc.ref.collection('pois').get();
    const pois = {};
    for (const p of poiSnap.docs) {
      pois[p.id] = serializeValue(p.data());
    }
    out[doc.id] = {
      ...data,
      __subcollections: { pois },
    };
  }
  return out;
}

async function main() {
  const credPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  const projectId = serviceAccount.project_id;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  const db = admin.firestore();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultPath = `/tmp/firestore-backup-${projectId}-${ts}.json`;
  const outPath = resolve(process.argv[2] ?? defaultPath);

  console.error(`[export] project: ${projectId}`);
  console.error(`[export] output:  ${outPath}`);

  console.error('[export] fetching workspaces (with pois)...');
  const workspaces = await exportWorkspacesWithPois(db);
  console.error(`[export]   ${Object.keys(workspaces).length} workspaces`);

  console.error('[export] fetching users...');
  const users = await exportCollection(db, 'users');
  console.error(`[export]   ${Object.keys(users).length} users`);

  console.error('[export] fetching invites (if any)...');
  let invites = {};
  try {
    invites = await exportCollection(db, 'invites');
  } catch {
    invites = {};
  }
  console.error(`[export]   ${Object.keys(invites).length} invites`);

  const dump = {
    __meta: {
      projectId,
      generatedAt: new Date().toISOString(),
      script: 'scripts/export-firestore.mjs',
      reason: '#228 pre-wipe backup',
      counts: {
        workspaces: Object.keys(workspaces).length,
        users: Object.keys(users).length,
        invites: Object.keys(invites).length,
        poisTotal: Object.values(workspaces).reduce(
          (n, w) => n + Object.keys(w.__subcollections?.pois ?? {}).length,
          0,
        ),
      },
    },
    workspaces,
    users,
    invites,
  };

  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8');

  const sizeKb = Math.round(JSON.stringify(dump).length / 1024);
  console.error(`[export] wrote ${sizeKb} KB`);
  console.error(`[export] DONE`);
  console.error('');
  console.error(`Counts: ${JSON.stringify(dump.__meta.counts)}`);
  console.error(`File:   ${outPath}`);
}

main().catch((err) => {
  console.error('[export-firestore] FAILED:', err.message);
  process.exit(1);
});
