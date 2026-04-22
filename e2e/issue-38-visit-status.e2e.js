/**
 * E2E smoke test: #38 Besuchsstatus.
 *
 * Read-only: verifies the visit-status button renders on POI cards.
 * Does NOT click it (would mutate real workspace data).
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
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  // Compact view (default) has icon-only button. Look for aria-label on status buttons.
  console.log('→ Searching for visit-status buttons (compact view)...');
  const statusButtonsCompact = await page.locator('button[aria-label*="besucht markieren"]').count();
  console.log(`Status buttons "Als besucht markieren": ${statusButtonsCompact}`);

  console.log('→ Switching to Grid view...');
  await page.click('button[aria-label="Grid-Ansicht"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.playwright-results/issue-38-1-grid-view.png', fullPage: false });

  console.log('→ Searching for "Offen" labels in grid buttons...');
  const offenCount = await page.locator('button:has-text("Offen")').count();
  console.log(`"Offen" buttons in grid: ${offenCount}`);

  if (statusButtonsCompact === 0 && offenCount === 0) {
    console.error('✗ No visit-status buttons found in any view');
    process.exit(1);
  }

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
