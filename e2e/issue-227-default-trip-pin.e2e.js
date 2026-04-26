/**
 * #227 Smoke — Default-Trip-Pin (cross-device).
 *
 *   1. Setup: two test workspaces (Owner = E2E user) seeded via Admin SDK
 *   2. Open app pointing at workspace A → app loads in A
 *   3. Pin workspace B via UI (TripSwitcher → PinOff icon)
 *   4. Verify users.{uid}.defaultWorkspaceId == B
 *   5. Open a fresh tab (new context, fresh sessionStorage) pointing at A
 *      → app should bootstrap into B (the pinned default)
 *   6. Cleanup
 */

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { getAuthenticatedContext } from './auth-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const RESULTS_DIR = resolve(projectRoot, '.playwright-results');
mkdirSync(RESULTS_DIR, { recursive: true });

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const E2E_UID = 'e2e-test-user-1';
const WS_A = `e2e-227-a-${Date.now().toString(36)}`;
const WS_B = `e2e-227-b-${Date.now().toString(36)}`;

let passed = 0;
let failed = 0;

function pass(s, m) { passed++; console.log(`✓ [${s}] ${m}`); }
function fail(s, m) { failed++; console.error(`✗ [${s}] ${m}`); }
function shotPath(name) { return resolve(RESULTS_DIR, `227-${name}.png`); }

async function main() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : resolve(projectRoot, 'service-account.json');
  if (!existsSync(credPath)) throw new Error(`Service account missing: ${credPath}`);
  const sa = JSON.parse(readFileSync(credPath, 'utf8'));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  // Seed both workspaces with E2E user as owner. Settings = DEFAULT_SETTINGS
  // shape so the app's render path doesn't crash on missing tripConfig.
  const defaultSettings = {
    tripStart: '2026-09-01',
    tripEnd: '2026-09-07',
    families: [
      { id: 'fam1', name: 'Familie 1', color: '#C96F4A' },
      { id: 'fam2', name: 'Familie 2', color: '#7A9C4D' },
    ],
    homebases: [],
    tripConfig: {
      city: 'Roma',
      country: 'Italia',
      language: 'Deutsch',
      categories: ['Sehenswürdigkeit', 'Restaurant', 'Café', 'Shopping', 'Sonstiges'],
      center: { lat: 41.8975, lng: 12.4825 },
      defaultZoom: 14,
      timezone: 'Europe/Rome',
      currency: 'EUR',
    },
  };
  for (const id of [WS_A, WS_B]) {
    await db.collection('workspaces').doc(id).set({
      ownerUid: E2E_UID,
      memberIds: [E2E_UID],
      createdAt: Date.now(),
      settings: defaultSettings,
      tripPlan: {},
      dayDescriptions: {},
      dayBriefings: {},
      dayBudgets: {},
      postTripAnalysis: '',
    });
  }
  // Ensure defaultWorkspaceId is reset (no stale value from previous run)
  await db.collection('users').doc(E2E_UID).set(
    { defaultWorkspaceId: admin.firestore.FieldValue.delete() },
    { merge: true },
  );
  console.log(`[227-smoke] seeded ${WS_A} + ${WS_B}, default cleared`);

  const browser = await chromium.launch({ headless: true });

  try {
    // ─── Step 1: open app on WS_A, app loads in A ───────────────────
    let ctx = await getAuthenticatedContext(browser, { width: 412, height: 900 });
    await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [
      'rhp:active-workspace',
      WS_A,
    ]);
    let page = await ctx.newPage();
    page.on('pageerror', (err) => console.error('[smoke] PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[smoke] CONSOLE:', msg.text().slice(0, 200));
    });
    await page.goto(BETA_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    try {
      const txt = await page.locator('body').innerText();
      if (txt.includes('Anmelden mit Google') || txt.includes('warten auf Freigabe')) {
        throw new Error('not signed-in');
      }
      pass('1', `app loaded on workspace ${WS_A}`);
    } catch (e) {
      await page.screenshot({ path: shotPath('1-load'), fullPage: true });
      fail('1', e.message);
      throw e;
    }

    // ─── Step 2: pin WS_B via TripSwitcher UI ───────────────────────
    try {
      // Wait for trip-switcher button to actually appear (React mount race)
      const switcher = page.locator('button[aria-label^="Trip wechseln"]');
      await switcher.waitFor({ state: 'attached', timeout: 15000 });
      await switcher.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: shotPath('2-dropdown'), fullPage: true });

      // Find the Pin button for WS_B. Aria-label: "<name> als Standard-Trip festlegen"
      // We pin via display name == workspace ID since we didn't set one.
      const pinBtn = page.getByRole('button', {
        name: new RegExp(`${WS_B}.*als Standard-Trip festlegen`),
      });
      await pinBtn.waitFor({ timeout: 5000 });
      // Force-click to bypass the opacity-0/group-hover layer
      await pinBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Verify Firestore
      const userSnap = await db.collection('users').doc(E2E_UID).get();
      if (userSnap.data()?.defaultWorkspaceId !== WS_B) {
        throw new Error(
          `defaultWorkspaceId is "${userSnap.data()?.defaultWorkspaceId}", expected "${WS_B}"`,
        );
      }
      pass('2', `pinned WS_B — users.defaultWorkspaceId = ${WS_B}`);
    } catch (e) {
      await page.screenshot({ path: shotPath('2-fail'), fullPage: true });
      fail('2', e.message);
    }

    await ctx.close();

    // ─── Step 3: fresh tab on WS_A → bootstrap should switch to WS_B ─
    try {
      ctx = await getAuthenticatedContext(browser, { width: 412, height: 900 });
      await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [
        'rhp:active-workspace',
        WS_A, // intentionally NOT WS_B — bootstrap should override
      ]);
      page = await ctx.newPage();
      await page.goto(BETA_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(6000); // allow bootstrap + workspace listener swap

      // The active workspace ID should now be WS_B because bootstrap switched.
      // Verify by checking localStorage was overwritten by setActiveWorkspaceId.
      // Verify via the trip-switcher's accessible name — that reflects React state,
      // which is the source of truth. localStorage may lag in headless contexts where
      // playwright's addInitScript races with the React mount, but the React state
      // is what the user sees + what the workspace listener subscribes to.
      const switcherLabel = await page
        .locator('button[aria-label^="Trip wechseln"]')
        .getAttribute('aria-label');
      if (!switcherLabel?.includes(WS_B)) {
        throw new Error(`switcher shows "${switcherLabel}", expected to contain "${WS_B}"`);
      }
      pass('3', 'fresh tab bootstrapped from WS_A → WS_B (header reflects WS_B)');
    } catch (e) {
      await page.screenshot({ path: shotPath('3-fail'), fullPage: true });
      fail('3', e.message);
    }

    await ctx.close();

    // ─── Step 4: unpin via UI → Firestore field cleared ──────────────
    try {
      ctx = await getAuthenticatedContext(browser, { width: 412, height: 900 });
      // No init-script — let bootstrap take us to WS_B
      page = await ctx.newPage();
      await page.goto(BETA_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(6000);

      await page.locator('button[aria-label^="Trip wechseln"]').click();
      await page.waitForTimeout(800);

      // Aria label is now "X als Standard-Trip lösen" (active default)
      const unpinBtn = page.getByRole('button', {
        name: new RegExp(`${WS_B}.*als Standard-Trip lösen`),
      });
      await unpinBtn.waitFor({ timeout: 5000 });
      await unpinBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const userSnap = await db.collection('users').doc(E2E_UID).get();
      if (userSnap.data()?.defaultWorkspaceId) {
        throw new Error(`defaultWorkspaceId still set: ${userSnap.data().defaultWorkspaceId}`);
      }
      pass('4', 'unpinned — defaultWorkspaceId removed from user doc');
    } catch (e) {
      await page.screenshot({ path: shotPath('4-fail'), fullPage: true });
      fail('4', e.message);
    }

    await ctx.close();
  } finally {
    await browser.close();
    // Cleanup
    for (const id of [WS_A, WS_B]) {
      try {
        await db.collection('workspaces').doc(id).delete();
      } catch { /* noop */ }
    }
    await db.collection('users').doc(E2E_UID).set(
      { defaultWorkspaceId: admin.firestore.FieldValue.delete() },
      { merge: true },
    );
    console.log('[227-smoke] cleanup done');
  }

  console.log(`\n[227-smoke] ${passed} passed / ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n[227-smoke] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
