/**
 * E2E smoke test: #75 + #76 — TripConfig UI renders in Settings.
 *
 * Read-only: navigiert zu Settings, verifiziert dass der TripConfigEditor
 * die erwarteten Felder zeigt (Stadt/Land/Sprache/Kategorien-Pills).
 * Modifiziert KEINE Workspace-Daten (Test-User teilt real workspace).
 *
 * Prereq: npm run e2e:token
 * Run:    npm run e2e:issue-75-76
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://holiday-planner-beta.web.app/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser);
  const page = await ctx.newPage();

  console.log('→ Navigating to Beta...');
  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('→ Waiting for authenticated app...');
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Switching to Settings-Tab...');
  await page.click('button[aria-label="Settings"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.playwright-results/issue-75-76-1-settings-tab.png', fullPage: true });

  console.log('→ Waiting for Trip-Konfiguration section...');
  await page.waitForSelector('text=Trip-Konfiguration', { timeout: 10000 });
  console.log('✓ TripConfigEditor rendered');

  // Verify key fields are present
  const cityInput = await page.locator('input[placeholder="Rom"]').count();
  const countryInput = await page.locator('input[placeholder="Italien"]').count();
  const languageSelect = await page.locator('select').count();
  console.log('City inputs:', cityInput, '| Country inputs:', countryInput, '| Selects:', languageSelect);

  if (cityInput === 0 || countryInput === 0 || languageSelect === 0) {
    console.error('✗ Required fields missing');
    process.exit(1);
  }

  // Verify at least one category pill (e.g. "Kultur" with emoji)
  const kulturPill = await page.locator('text=Kultur').count();
  console.log('Kultur pill/text count:', kulturPill);
  if (kulturPill === 0) {
    console.error('✗ Default categories not visible');
    process.exit(1);
  }

  // Add-category input + button
  const addInput = await page.locator('input[placeholder*="Ramen"]').count();
  console.log('Add-category input count:', addInput);

  await page.screenshot({ path: '.playwright-results/issue-75-76-2-tripconfig-details.png', fullPage: true });

  // Scroll down to show more of the form
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.playwright-results/issue-75-76-3-scrolled.png', fullPage: true });

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
