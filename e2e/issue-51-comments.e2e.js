/**
 * E2E smoke test: #51 POI-Comments.
 *
 * Flow:
 *   1. Sign in + navigate to Entdecken-Tab
 *   2. Open first POI's Edit-Modal
 *   3. Verify "Notizen & Kommentare" section + textarea + Senden-Button exist
 *
 * Read-only: schreibt keinen Kommentar (würde persistierbaren state auf
 * real workspace mutieren).
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser);
  const page = await ctx.newPage();

  console.log('→ Navigating to Beta...');
  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Looking for comment badges on POI cards...');
  // Each POI card should have a message-circle + count
  const badgeCount = await page.locator('button[aria-label*="Kommentare"]').count();
  console.log(`Comment badges visible on POI cards: ${badgeCount}`);
  await page.screenshot({ path: '.playwright-results/issue-51-1-cards-with-badges.png', fullPage: false });

  if (badgeCount === 0) {
    console.error('✗ No comment badges found — POIs may not be loaded yet');
    process.exit(1);
  }

  console.log('→ Switching to Grid-Ansicht (pencil buttons only visible there)...');
  const gridBtn = page.locator('button[aria-label="Grid-Ansicht"]');
  if (await gridBtn.count()) {
    await gridBtn.click();
    await page.waitForTimeout(800);
  }

  console.log('→ Opening first POI via Edit (pencil)...');
  const editButton = page.locator('button[aria-label="Bearbeiten"]').first();
  await editButton.click({ timeout: 10000 });
  await page.waitForSelector('text=Ort bearbeiten', { timeout: 5000 });
  await page.screenshot({ path: '.playwright-results/issue-51-2-edit-modal.png', fullPage: true });

  console.log('→ Verifying Comment-Thread section...');
  await page.waitForSelector('text=Notizen & Kommentare', { timeout: 3000 });
  const placeholderCount = await page.locator('textarea[placeholder*="Notiz"]').count();
  const sendButton = await page.locator('button:has-text("Senden")').count();
  console.log('Comment textarea:', placeholderCount, '| Send button:', sendButton);

  if (placeholderCount === 0 || sendButton === 0) {
    console.error('✗ Comment input fields missing');
    process.exit(1);
  }

  await page.screenshot({ path: '.playwright-results/issue-51-3-comment-ui.png', fullPage: true });

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
