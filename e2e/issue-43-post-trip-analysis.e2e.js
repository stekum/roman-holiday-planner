/**
 * E2E smoke test: #43 AI Post-Trip-Analyse.
 *
 * Read-only: verifies AiPostTripPanel rendert im Reise-Tab mit Button
 * "Analyse erzeugen" ODER "Analyse aktualisieren". Triggert KEINE
 * tatsächliche Gemini-Generation (würde API-Quota belasten + flakey).
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  console.log('→ Navigating to Beta...');
  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Switching to Reise-Tab...');
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(2000);

  const noDates = await page.locator('text=Reise-Zeitraum').count();
  if (noDates > 0) {
    console.log('⚠ Test user has no trip dates — skipping.');
    await browser.close();
    return;
  }

  // Scroll to bottom so lazy elements render
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  console.log('→ Check AI Post-Trip-Analyse Panel…');
  const panel = page.locator('div:has-text("AI Post-Trip-Analyse")').first();
  const panelCount = await panel.count();
  console.log(`  Panels found: ${panelCount}`);

  if (panelCount === 0) {
    console.error('✗ AI Post-Trip-Analyse Panel not found in DOM');
    process.exit(1);
  }

  // Button text sollte entweder "Analyse erzeugen" oder "Analyse aktualisieren" sein
  const btnCount = await page
    .locator('button:has-text("Post-Trip-Analyse erzeugen"), button:has-text("Analyse aktualisieren")')
    .count();
  console.log(`  Trigger button found: ${btnCount}`);

  if (btnCount === 0) {
    console.error('✗ Trigger button missing');
    process.exit(1);
  }

  await page.screenshot({ path: '.playwright-results/issue-43-panel.png', fullPage: true });
  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
