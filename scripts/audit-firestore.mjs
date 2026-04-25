#!/usr/bin/env node
/**
 * Audit Firestore state for #228 Workspace Access Control planning.
 *
 * Read-only. Lists every workspaces/* + users/* document with the fields
 * that matter for the upcoming hard-reset migration:
 *   - workspaces:  id, settings.tripConfig.tripName, settings.families[].name,
 *                  settings.tripConfig.startDate, ownerUid?, memberIds?,
 *                  POI-count, has-tripPlan?
 *   - users:       uid, email, displayName, status, workspaceIds[]
 *
 * Output: Markdown to stdout. Pipe to a file for diffing later.
 *
 * Usage:
 *   node scripts/audit-firestore.mjs
 *   node scripts/audit-firestore.mjs > /tmp/audit-prod-pre228.md
 *
 * Auth: same as mint-e2e-token.mjs (GOOGLE_APPLICATION_CREDENTIALS or
 * ./service-account.json). The service account targets whatever project
 * is in the JSON — Beta and Prod both live in the same Firebase project
 * `roman-holiday-planner`, so the audit shows BOTH unless the project
 * has been split. Confirm project_id in the header line of the output.
 */

import { readFileSync, existsSync } from 'node:fs';
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

function fmtDate(ts) {
  if (!ts) return '—';
  if (ts.toDate) return ts.toDate().toISOString().slice(0, 10);
  if (typeof ts === 'string') return ts.slice(0, 10);
  return String(ts);
}

function trunc(s, n = 30) {
  if (!s) return '—';
  const str = String(s);
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

async function auditWorkspaces(db) {
  const snap = await db.collection('workspaces').get();
  const rows = [];
  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    const settings = data.settings ?? {};
    const tripConfig = settings.tripConfig ?? {};
    const families = Array.isArray(settings.families) ? settings.families : [];
    const homebases = Array.isArray(settings.homebases) ? settings.homebases : [];

    // POI count via subcollection
    const poiSnap = await doc.ref.collection('pois').count().get();
    const poiCount = poiSnap.data().count;

    // tripPlan presence (just check if field exists with any keys)
    const tripPlan = data.tripPlan ?? {};
    const tripPlanDays = Object.keys(tripPlan).length;

    rows.push({
      id: doc.id,
      tripName: tripConfig.tripName ?? settings.tripName ?? '—',
      startDate: fmtDate(tripConfig.startDate ?? settings.startDate),
      endDate: fmtDate(tripConfig.endDate ?? settings.endDate),
      familyCount: families.length,
      familyNames: families.map((f) => f.name).join(', '),
      homebaseCount: homebases.length,
      poiCount,
      tripPlanDays,
      hasOwnerUid: !!data.ownerUid,
      hasMemberIds: Array.isArray(data.memberIds),
      ownerUid: data.ownerUid ?? '—',
      memberCount: Array.isArray(data.memberIds) ? data.memberIds.length : 0,
    });
  }
  return rows;
}

async function auditUsers(db) {
  const snap = await db.collection('users').get();
  const rows = [];
  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    rows.push({
      uid: doc.id,
      email: data.email ?? '—',
      displayName: data.displayName ?? '—',
      status: data.status ?? '—',
      workspaceCount: Array.isArray(data.workspaceIds) ? data.workspaceIds.length : 0,
      workspaceIds: Array.isArray(data.workspaceIds) ? data.workspaceIds : [],
      isE2E: !!data.__e2eTestUser,
      createdAt: fmtDate(data.createdAt),
    });
  }
  return rows;
}

function renderWorkspacesTable(rows) {
  if (rows.length === 0) return '_No workspaces._\n';
  const lines = [
    '| ID | Trip-Name | Start | Ende | Families | Homebases | POIs | Plan-Tage | Owner-UID | Member-Count |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| \`${trunc(r.id, 24)}\` | ${trunc(r.tripName, 30)} | ${r.startDate} | ${r.endDate} | ${r.familyCount} (${trunc(r.familyNames, 40)}) | ${r.homebaseCount} | ${r.poiCount} | ${r.tripPlanDays} | ${r.hasOwnerUid ? '`' + trunc(r.ownerUid, 12) + '`' : '❌ fehlt'} | ${r.hasMemberIds ? r.memberCount : '❌ kein memberIds'} |`,
    );
  }
  return lines.join('\n') + '\n';
}

function renderUsersTable(rows) {
  if (rows.length === 0) return '_No users._\n';
  const lines = [
    '| UID | Email | Name | Status | Workspaces | E2E? | Created |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| \`${trunc(r.uid, 16)}\` | ${trunc(r.email, 32)} | ${trunc(r.displayName, 20)} | ${r.status} | ${r.workspaceCount} ${r.workspaceIds.length > 0 ? '(' + r.workspaceIds.map((w) => trunc(w, 14)).join(', ') + ')' : ''} | ${r.isE2E ? '✓' : ''} | ${r.createdAt} |`,
    );
  }
  return lines.join('\n') + '\n';
}

function renderSummary(workspaces, users) {
  const lines = [];
  lines.push(`- **Workspaces total:** ${workspaces.length}`);
  lines.push(`  - Mit Trip-Namen: ${workspaces.filter((w) => w.tripName !== '—').length}`);
  lines.push(`  - Mit POIs: ${workspaces.filter((w) => w.poiCount > 0).length}`);
  lines.push(`  - Mit ownerUid: ${workspaces.filter((w) => w.hasOwnerUid).length} _(neu für #228)_`);
  lines.push(`  - Mit memberIds: ${workspaces.filter((w) => w.hasMemberIds).length} _(neu für #228)_`);
  lines.push('');
  lines.push(`- **Users total:** ${users.length}`);
  lines.push(`  - Approved: ${users.filter((u) => u.status === 'approved').length}`);
  lines.push(`  - Pending: ${users.filter((u) => u.status === 'pending').length}`);
  lines.push(`  - E2E-Test-User: ${users.filter((u) => u.isE2E).length}`);
  lines.push(`  - Mit workspaceIds[]: ${users.filter((u) => u.workspaceCount > 0).length}`);
  return lines.join('\n') + '\n';
}

async function main() {
  const credPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();
  const now = new Date().toISOString();

  process.stdout.write(`# Firestore Audit — Pre-#228\n\n`);
  process.stdout.write(`**Project:** \`${serviceAccount.project_id}\`  \n`);
  process.stdout.write(`**Generated:** ${now}  \n`);
  process.stdout.write(`**Script:** \`scripts/audit-firestore.mjs\` (read-only)\n\n`);

  const workspaces = await auditWorkspaces(db);
  const users = await auditUsers(db);

  process.stdout.write('## Summary\n\n');
  process.stdout.write(renderSummary(workspaces, users));
  process.stdout.write('\n');

  process.stdout.write('## Workspaces\n\n');
  process.stdout.write(renderWorkspacesTable(workspaces));
  process.stdout.write('\n');

  process.stdout.write('## Users\n\n');
  process.stdout.write(renderUsersTable(users));
  process.stdout.write('\n');

  process.stdout.write('## Migration-Decision (Hard-Reset, #228)\n\n');
  process.stdout.write(
    'Alle oben gelisteten `workspaces/*` und `users/*` (außer Stefan-Admin) werden vom kommenden ' +
      '`scripts/wipe-firestore.mjs` gelöscht. Stefan reviewt diese Tabelle bevor das Cleanup-Script ' +
      'ausgeführt wird. Wenn Workspaces dabei sind die erhalten bleiben sollen → STOP, neue Strategie.\n',
  );
}

main().catch((err) => {
  console.error('[audit-firestore] FAILED:', err.message);
  process.exit(1);
});
