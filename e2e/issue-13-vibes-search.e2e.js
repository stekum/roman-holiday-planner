/**
 * E2E smoke test: #13 AI Natural Language POI Search (Vibes-Suche).
 *
 * Flow:
 *   1. Sign in via E2E custom token (auth-helper)
 *   2. Open + FAB → Vibes-Suche tile
 *   3. Type a vibe query → click Finden
 *   4. Verify Gemini responded (criteria chips)
 *   5. Verify Places results rendered
 *   6. Screenshots at each step into .playwright-results/
 *
 * Prereq:
 *   npm run e2e:token
 *
 * Run:
 *   npm run e2e:issue-13
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';
const QUERY = 'Romantisches Restaurant mit Terrasse in Trastevere';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser);
  const page = await ctx.newPage();

  console.log('→ Navigating to Beta...');
  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('→ Waiting for authenticated app (FAB)...');
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.screenshot({ path: '.playwright-results/issue-13-1-app-loaded.png' });
  console.log('✓ Signed in, app rendered');

  console.log('→ Opening Add menu...');
  await page.click('button[aria-label="Ort hinzufügen"]');
  await page.waitForSelector('text=Vibes-Suche', { timeout: 5000 });
  await page.screenshot({ path: '.playwright-results/issue-13-2-add-menu.png' });
  console.log('✓ Add menu open, Vibes-Suche tile visible');

  console.log('→ Opening Vibes-Suche...');
  await page.click('text=Vibes-Suche');
  await page.waitForSelector('textarea', { timeout: 3000 });
  await page.screenshot({ path: '.playwright-results/issue-13-3-vibes-form.png' });

  console.log(`→ Typing query: "${QUERY}"`);
  await page.fill('textarea', QUERY);
  await page.screenshot({ path: '.playwright-results/issue-13-4-query-typed.png' });

  console.log('→ Clicking Finden (Gemini + Places, may take 5-15s)...');
  await page.click('button:has-text("Finden")');

  try {
    await page.waitForSelector('text=AI hat verstanden', { timeout: 30000 });
    console.log('✓ Gemini responded');
  } catch (e) {
    console.error('✗ Gemini response timeout');
    await page.screenshot({ path: '.playwright-results/issue-13-FAIL-gemini-timeout.png', fullPage: true });
    throw e;
  }

  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.playwright-results/issue-13-5-results.png', fullPage: true });

  const chips = await page.locator('.bg-olive\\/15').allTextContents();
  const resultButtons = await page.locator('ul > li > button').count();
  console.log('Criteria chips:', JSON.stringify(chips));
  console.log('Result count:', resultButtons);

  if (resultButtons === 0) {
    console.error('✗ Zero Places results — investigate');
    process.exit(1);
  }
  if (chips.length === 0) {
    console.error('✗ No criteria chips — Gemini JSON parse may have fallen back');
  }

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
