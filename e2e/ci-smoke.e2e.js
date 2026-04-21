/**
 * #172: CI Smoke-Test-Suite gegen Beta.
 *
 * Drei Golden-Paths:
 *   1. Beta bootet + keine Firebase-Error-Overlays
 *   2. Custom-Token-Auth erfolgreich (Service-Account benötigt)
 *   3. POI-Liste lädt nach Auth (>0 POIs sichtbar)
 *
 * Aufruf:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run e2e:token
 *   node e2e/ci-smoke.e2e.js
 *
 * Exit 0 bei allen grün, 1 bei mind. einem Fail. Screenshots bei Fail
 * landen in `.playwright-results/ci-smoke/`.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';
const ART_DIR = '.playwright-results/ci-smoke';

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function test1_boot(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  try {
    await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const body = await page.evaluate(() => document.body.innerText);
    const hasFbError = /firebase.*nicht konfiguriert|api-key-not-valid/i.test(body);
    const hasLoginUI = /Mit Google anmelden/i.test(body);

    if (hasFbError) {
      await page.screenshot({ path: `${ART_DIR}/test1-fb-error.png` });
      record('test1: boot without FB error', false, 'Firebase error visible on page');
    } else if (!hasLoginUI) {
      await page.screenshot({ path: `${ART_DIR}/test1-no-login.png` });
      record('test1: boot without FB error', false, 'Login UI not rendered');
    } else if (pageErrors.length > 0) {
      record('test1: boot without FB error', false, `${pageErrors.length} page errors`);
    } else {
      record('test1: boot without FB error', true);
    }
  } catch (err) {
    record('test1: boot without FB error', false, err.message.slice(0, 120));
  } finally {
    await ctx.close();
  }
}

async function test2and3_authAndPois(browser) {
  let ctx, page;
  try {
    ctx = await getAuthenticatedContext(browser, { width: 1280, height: 900 });
    page = await ctx.newPage();
    await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);

    const body = await page.evaluate(() => document.body.innerText);

    // Test 2: if Auth succeeded, we should NOT see the Login UI anymore
    const stillSeesLogin = /Mit Google anmelden/i.test(body);
    if (stillSeesLogin) {
      await page.screenshot({ path: `${ART_DIR}/test2-auth-fail.png` });
      record('test2: custom-token auth', false, 'Login UI still visible after token injection');
      record('test3: POIs load', false, 'skipped (auth failed)');
      return;
    }
    record('test2: custom-token auth', true);

    // Test 3: POI-Count from the header text („N Orte")
    const poiCountMatch = body.match(/(\d+)\s+Orte\b/);
    const poiCount = poiCountMatch ? parseInt(poiCountMatch[1], 10) : 0;
    if (poiCount > 0) {
      record('test3: POIs load', true, `${poiCount} POIs`);
    } else {
      await page.screenshot({ path: `${ART_DIR}/test3-no-pois.png` });
      record('test3: POIs load', false, 'no "N Orte" indicator found in body');
    }
  } catch (err) {
    if (page) {
      await page.screenshot({ path: `${ART_DIR}/test2-exception.png` }).catch(() => {});
    }
    record('test2: custom-token auth', false, err.message.slice(0, 120));
    record('test3: POIs load', false, 'skipped (exception)');
  } finally {
    if (ctx) await ctx.close();
  }
}

async function main() {
  mkdirSync(ART_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    await test1_boot(browser);
    await test2and3_authAndPois(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('SUITE FATAL:', err);
  process.exit(2);
});
