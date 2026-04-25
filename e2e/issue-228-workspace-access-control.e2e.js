/**
 * #228 Smoke — Workspace Access Control + Invite Flow
 *
 * Verifies the full happy-path on Beta:
 *   1. App loads as authed E2E user (no PendingScreen, no errors)
 *   2. New workspace created on first visit gets ownerUid + memberIds = [e2e-user]
 *   3. Settings tab shows the WorkspaceMembersSection with the user marked as Owner
 *   4. Owner generates a share-link
 *   5. invites/{token} doc exists in Firestore with correct shape
 *
 * Usage:
 *   node scripts/mint-e2e-token.mjs   # if token expired
 *   node e2e/issue-228-workspace-access-control.e2e.js
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import { getAuthenticatedContext } from './auth-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const RESULTS_DIR = resolve(projectRoot, '.playwright-results');
mkdirSync(RESULTS_DIR, { recursive: true });

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const E2E_UID = 'e2e-test-user-1';
// Each run uses a unique workspace ID so we don't collide with previous runs
const TEST_WORKSPACE_ID = `e2e-228-${Date.now().toString(36)}`;

function logStep(step, msg) {
  console.log(`[228-smoke] ${step}: ${msg}`);
}

function shotPath(name) {
  return resolve(RESULTS_DIR, `228-${name}.png`);
}

async function getDb() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : resolve(projectRoot, 'service-account.json');
  if (!existsSync(credPath)) throw new Error('No service account found');
  const sa = JSON.parse(readFileSync(credPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

let createdInviteToken = null;

async function run() {
  const db = await getDb();
  const browser = await chromium.launch({ headless: true });

  try {
    const ctx = await getAuthenticatedContext(browser, { width: 412, height: 900 });

    // Override the active workspace via localStorage so we get a deterministic
    // ID per test run. WorkspaceProvider reads this on mount.
    await ctx.addInitScript(([k, v]) => {
      window.localStorage.setItem(k, v);
    }, ['rhp:active-workspace', TEST_WORKSPACE_ID]);

    const page = await ctx.newPage();

    page.on('pageerror', (err) => {
      console.error('[228-smoke] PAGE ERROR:', err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[228-smoke] CONSOLE ERROR:', msg.text());
      }
    });

    // ─── Step 1: Load + auth ───────────────────────────────────────
    logStep('1', `loading ${BETA_URL} with workspace=${TEST_WORKSPACE_ID}`);
    await page.goto(BETA_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // give auto-create + auth + Firestore listener time

    await page.screenshot({ path: shotPath('01-loaded'), fullPage: true });

    // Quick-check: did we land on PendingScreen / LoginScreen by mistake?
    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Anmelden mit Google') || bodyText.includes('Sign in')) {
      throw new Error('Step 1 FAIL — landed on LoginScreen, auth failed');
    }
    if (bodyText.includes('warten auf Freigabe')) {
      throw new Error('Step 1 FAIL — landed on PendingScreen');
    }
    logStep('1', '✓ app loaded, authed (no login/pending screen)');

    // ─── Step 2: Verify auto-create wrote ownerUid + memberIds ─────
    logStep('2', 'checking workspace doc shape');
    // Backend Firestore listener has its own latency — poll up to 8s.
    let wsDoc = null;
    for (let i = 0; i < 16; i++) {
      const snap = await db.collection('workspaces').doc(TEST_WORKSPACE_ID).get();
      if (snap.exists) {
        wsDoc = snap.data();
        if (wsDoc.ownerUid && Array.isArray(wsDoc.memberIds)) break;
      }
      await page.waitForTimeout(500);
    }
    if (!wsDoc) throw new Error('Step 2 FAIL — workspace doc never created');
    if (wsDoc.ownerUid !== E2E_UID) {
      throw new Error(
        `Step 2 FAIL — ownerUid is "${wsDoc.ownerUid}", expected "${E2E_UID}"`,
      );
    }
    if (!Array.isArray(wsDoc.memberIds) || wsDoc.memberIds[0] !== E2E_UID) {
      throw new Error(
        `Step 2 FAIL — memberIds is ${JSON.stringify(wsDoc.memberIds)}, expected [${E2E_UID}]`,
      );
    }
    logStep('2', `✓ workspace has ownerUid=${E2E_UID} memberIds=[${wsDoc.memberIds.join(',')}]`);

    // ─── Step 3: Settings → Mitglieder section visible w/ Owner badge
    logStep('3', 'opening Settings tab');
    // Header has tabs "Entdecken / Reise / Settings" — click via aria-label or text
    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shotPath('02-settings'), fullPage: true });

    const settingsText = await page.locator('body').innerText();
    if (!settingsText.includes('Mitglieder')) {
      throw new Error('Step 3 FAIL — "Mitglieder" heading not found in Settings');
    }
    if (!settingsText.includes('Owner')) {
      throw new Error('Step 3 FAIL — "Owner" badge not visible (current user should be owner)');
    }
    if (!settingsText.includes('Einladungs-Link erstellen')) {
      throw new Error('Step 3 FAIL — "Einladungs-Link erstellen" button not visible');
    }
    logStep('3', '✓ Mitglieder section + Owner badge + share button all rendered');

    // ─── Step 4: Click share button → invite created ───────────────
    logStep('4', 'clicking share button');
    await page.getByRole('button', { name: /einladungs-link erstellen/i }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: shotPath('03-share-link'), fullPage: true });

    // The share URL is in a readonly input — extract value to grab the token
    const shareInput = page.locator('input[readonly]').first();
    const shareUrl = await shareInput.inputValue();
    if (!shareUrl || !shareUrl.includes('?invite=')) {
      throw new Error(`Step 4 FAIL — share URL malformed: ${shareUrl}`);
    }
    const url = new URL(shareUrl);
    createdInviteToken = url.searchParams.get('invite');
    if (!createdInviteToken || !/^[a-z0-9]{32}$/.test(createdInviteToken)) {
      throw new Error(`Step 4 FAIL — invalid token: ${createdInviteToken}`);
    }
    logStep('4', `✓ share link generated, token=${createdInviteToken.slice(0, 8)}…`);

    // ─── Step 5: Verify invites/{token} doc shape ──────────────────
    logStep('5', 'verifying invites/{token} doc');
    const inviteSnap = await db.collection('invites').doc(createdInviteToken).get();
    if (!inviteSnap.exists) throw new Error('Step 5 FAIL — invite doc not found');
    const inv = inviteSnap.data();
    const checks = [
      [inv.workspaceId === TEST_WORKSPACE_ID, `workspaceId == ${TEST_WORKSPACE_ID}`],
      [inv.createdBy === E2E_UID, `createdBy == ${E2E_UID}`],
      [inv.used === false, 'used === false'],
      [inv.expiresAt && inv.expiresAt.toMillis() > Date.now(), 'expiresAt in future'],
    ];
    for (const [ok, desc] of checks) {
      if (!ok) throw new Error(`Step 5 FAIL — ${desc}`);
    }
    logStep('5', '✓ invite doc shape correct');

    console.log('\n[228-smoke] ALL STEPS PASSED ✓');
    console.log(`  Workspace: ${TEST_WORKSPACE_ID}`);
    console.log(`  Token:     ${createdInviteToken}`);
    console.log(`  Screenshots: ${RESULTS_DIR}`);
  } finally {
    await browser.close();

    // Cleanup: delete the test workspace + invite doc
    if (createdInviteToken) {
      try {
        await (await getDb()).collection('invites').doc(createdInviteToken).delete();
      } catch {
        /* noop */
      }
    }
    try {
      await (await getDb()).collection('workspaces').doc(TEST_WORKSPACE_ID).delete();
      console.log(`[228-smoke] cleaned up workspace ${TEST_WORKSPACE_ID}`);
    } catch {
      /* noop */
    }
  }
}

run().catch((err) => {
  console.error('\n[228-smoke] FAILED:', err.message);
  console.error(`Screenshots in: ${RESULTS_DIR}`);
  process.exit(1);
});
