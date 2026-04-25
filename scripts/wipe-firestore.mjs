#!/usr/bin/env node
/**
 * Hard-reset wipe for #228 Workspace Access Control migration.
 *
 * Deletes:
 *   - Every workspaces/* document AND its pois subcollection
 *   - Every users/* document EXCEPT:
 *       - stefan.kummert@gmail.com (admin, hardcoded in firestore.rules)
 *       - users with __e2eTestUser=true (keeps E2E auth working)
 *   - Every invites/* document (preempts #228 collection)
 *
 * Does NOT touch:
 *   - Firebase Auth (auth users stay; they get fresh users/{uid} docs on next login)
 *   - Firebase Storage (POI photos remain orphaned, separate cleanup TBD)
 *
 * Safety properties:
 *   - Dry-run by default (no flags = list-only)
 *   - --confirm <project-id> required for actual deletes; the project-id
 *     in the service-account.json MUST match this argument
 *   - --backup <path> required (and not in dry-run); checks file exists,
 *     project-id matches, and mtime <24h
 *   - Stefan-admin + E2E-user are never deleted (Email/__e2eTestUser checks)
 *
 * Usage:
 *   # 1) Dry-run, just see what would be deleted
 *   node scripts/wipe-firestore.mjs
 *
 *   # 2) Real wipe with backup verification
 *   node scripts/wipe-firestore.mjs \
 *     --confirm roman-holiday-planner-6ac48 \
 *     --backup ~/Backups/roman-holidays/firestore-backup-....json
 */

import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const ADMIN_EMAIL = 'stefan.kummert@gmail.com';

function parseArgs(argv) {
  const out = { confirm: null, backup: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--confirm') out.confirm = argv[++i];
    else if (a === '--backup') out.backup = argv[++i];
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        'Usage: node scripts/wipe-firestore.mjs [--confirm <project-id> --backup <path>]\n' +
          '  No flags  = dry-run\n' +
          '  --confirm = required to actually delete; must match project_id\n' +
          '  --backup  = required when --confirm is set; backup JSON must exist,\n' +
          '              match project_id, and be <24h old\n',
      );
      process.exit(0);
    }
  }
  return out;
}

function resolveServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const path = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!existsSync(path)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS missing: ${path}`);
    }
    return path;
  }
  const fallback = resolve(projectRoot, 'service-account.json');
  if (existsSync(fallback)) return fallback;
  throw new Error('No Firebase service account found.');
}

function verifyBackup(backupPath, projectId) {
  if (!backupPath) {
    throw new Error('--backup is required for non-dry-run. Run scripts/export-firestore.mjs first.');
  }
  const abs = resolve(backupPath.replace(/^~/, process.env.HOME ?? ''));
  if (!existsSync(abs)) {
    throw new Error(`Backup file does not exist: ${abs}`);
  }
  const ageMs = Date.now() - statSync(abs).mtimeMs;
  const hours = ageMs / 1000 / 3600;
  if (hours > 24) {
    throw new Error(`Backup is ${hours.toFixed(1)}h old (>24h). Make a fresh export first.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    throw new Error(`Backup file is not valid JSON: ${e.message}`);
  }
  const meta = parsed.__meta ?? {};
  if (meta.projectId !== projectId) {
    throw new Error(
      `Backup project mismatch: backup has '${meta.projectId}', service account has '${projectId}'.`,
    );
  }
  console.error(`[wipe] backup verified: ${abs}`);
  console.error(`[wipe]   project: ${meta.projectId}, age: ${hours.toFixed(1)}h, counts: ${JSON.stringify(meta.counts)}`);
}

async function planWipe(db) {
  const wsSnap = await db.collection('workspaces').get();
  const usersSnap = await db.collection('users').get();
  const invSnap = await db.collection('invites').get().catch(() => ({ docs: [] }));

  const workspaces = [];
  for (const doc of wsSnap.docs) {
    const poiSnap = await doc.ref.collection('pois').count().get();
    workspaces.push({ id: doc.id, poiCount: poiSnap.data().count });
  }

  const usersToDelete = [];
  const usersToKeep = [];
  for (const doc of usersSnap.docs) {
    const data = doc.data() ?? {};
    const isAdmin = data.email === ADMIN_EMAIL;
    const isE2E = data.__e2eTestUser === true;
    if (isAdmin || isE2E) {
      usersToKeep.push({ uid: doc.id, email: data.email, reason: isAdmin ? 'admin' : 'e2e' });
    } else {
      usersToDelete.push({ uid: doc.id, email: data.email });
    }
  }

  return {
    workspaces,
    usersToDelete,
    usersToKeep,
    invites: invSnap.docs.map((d) => d.id),
  };
}

function printPlan(plan, mode) {
  console.error('');
  console.error(`========== WIPE PLAN (mode: ${mode}) ==========`);
  console.error('');
  console.error(`Workspaces to delete: ${plan.workspaces.length}`);
  for (const w of plan.workspaces) {
    console.error(`  - ${w.id}  (${w.poiCount} pois will be cascaded)`);
  }
  console.error('');
  console.error(`Users to delete: ${plan.usersToDelete.length}`);
  for (const u of plan.usersToDelete) {
    console.error(`  - ${u.uid}  ${u.email ?? '(no email)'}`);
  }
  console.error('');
  console.error(`Users to KEEP: ${plan.usersToKeep.length}`);
  for (const u of plan.usersToKeep) {
    console.error(`  - ${u.uid}  ${u.email ?? '(no email)'}  [${u.reason}]`);
  }
  console.error('');
  console.error(`Invites to delete: ${plan.invites.length}`);
  console.error('');
  console.error('================================================');
  console.error('');
}

async function deleteWorkspace(db, workspaceId) {
  const ref = db.collection('workspaces').doc(workspaceId);
  // Cascade pois subcollection
  const poiSnap = await ref.collection('pois').get();
  let batch = db.batch();
  let count = 0;
  for (const p of poiSnap.docs) {
    batch.delete(p.ref);
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  await ref.delete();
  console.error(`[wipe]   deleted workspace ${workspaceId} (${poiSnap.docs.length} pois)`);
}

async function executeWipe(db, plan) {
  console.error('[wipe] EXECUTING (this is not a drill)');

  for (const w of plan.workspaces) {
    await deleteWorkspace(db, w.id);
  }

  for (const u of plan.usersToDelete) {
    await db.collection('users').doc(u.uid).delete();
    console.error(`[wipe]   deleted user ${u.uid} ${u.email ?? ''}`);
  }

  for (const id of plan.invites) {
    await db.collection('invites').doc(id).delete();
    console.error(`[wipe]   deleted invite ${id}`);
  }

  console.error('[wipe] DONE');
}

async function main() {
  const args = parseArgs(process.argv);
  const credPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  const projectId = serviceAccount.project_id;

  console.error(`[wipe] project: ${projectId}`);

  const isDryRun = !args.confirm;
  if (!isDryRun) {
    if (args.confirm !== projectId) {
      throw new Error(
        `--confirm '${args.confirm}' does not match service account project '${projectId}'. ` +
          `Refusing to delete.`,
      );
    }
    verifyBackup(args.backup, projectId);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
  const db = admin.firestore();

  const plan = await planWipe(db);
  printPlan(plan, isDryRun ? 'DRY-RUN' : 'EXECUTE');

  if (isDryRun) {
    console.error('[wipe] dry-run only. Pass --confirm <project-id> --backup <path> to execute.');
    return;
  }

  // Final 5-second pause to allow Ctrl-C
  console.error('[wipe] starting in 5 seconds... (Ctrl-C to abort)');
  await new Promise((r) => setTimeout(r, 5000));

  await executeWipe(db, plan);
}

main().catch((err) => {
  console.error('[wipe-firestore] FAILED:', err.message);
  process.exit(1);
});
