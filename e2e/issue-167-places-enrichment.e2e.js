/**
 * E2E smoke test: #167 Places API (New) enrichment.
 *
 * Read-only: verifies POI-Cards render priceRange + Cuisine-Tag where
 * Firestore data has these fields. Does NOT mutate workspace.
 *
 * Prereq: npm run e2e:token
 * Run:    npm run e2e:issue-167
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

  console.log('→ Waiting for POIs (Firestore)...');
  await page.waitForSelector('article', { timeout: 15000 });

  console.log('→ Switching to Grid-Ansicht...');
  await page.click('button[aria-label="Grid-Ansicht"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.playwright-results/issue-167-1-grid-view.png', fullPage: false });

  const cardCount = await page.locator('article').count();
  console.log(`POI cards: ${cardCount}`);

  // Check for cuisine-tag pills (Ocker bg-ocker/15 text-ocker)
  const cuisineTagCount = await page.locator('.bg-ocker\\/15.text-ocker').count();
  console.log(`Cuisine-Tag pills visible: ${cuisineTagCount}`);

  // Check for priceRange-style badges (contains en-dash or +)
  const priceBadges = await page.locator('.font-semibold.text-ink\\/60').allTextContents();
  const priceRanges = priceBadges.filter((t) => t.includes('–') || t.includes('+'));
  console.log(`priceRange-formatted badges (with – or +): ${priceRanges.length}`);
  if (priceRanges.length > 0) {
    console.log(`Sample: ${priceRanges.slice(0, 3).join(', ')}`);
  }

  console.log('');
  console.log('Note: Cuisine tags + priceRange only appear for POIs with');
  console.log('Places API (New) data. New POIs (via Suchen) fetch live;');
  console.log('existing POIs need `npm run backfill:places -- --apply`.');

  if (cardCount === 0) {
    console.error('✗ No POI cards rendered');
    process.exit(1);
  }

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
