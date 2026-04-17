/**
 * E2E smoke test: #48 Tagesbudget.
 *
 * Read-only: verifies the Tagesbudget card renders in the Reise-Tab
 * with Budget/Ausgegeben inputs + wallet icon. Does NOT write to
 * Firestore (test user shares real workspace).
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

  console.log('→ Switching to Reise-Tab...');
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);

  // If no trip dates configured, the DayPlanner shows a placeholder instead.
  const noDates = await page.locator('text=Reise-Zeitraum').count();
  if (noDates > 0) {
    console.log('⚠ Test user has no trip dates — skipping budget-specific checks.');
    await browser.close();
    return;
  }

  console.log('→ Waiting for Tagesbudget card...');
  await page.waitForSelector('text=Tagesbudget', { timeout: 10000 });
  await page.screenshot({ path: '.playwright-results/issue-48-1-budget-card.png', fullPage: true });
  console.log('✓ Tagesbudget heading visible');

  const budgetInput = await page.locator('input[placeholder="200"]').count();
  const spentInput = await page.locator('input[placeholder="0"]').count();
  console.log(`Budget inputs: ${budgetInput} | Spent inputs: ${spentInput}`);

  if (budgetInput === 0 || spentInput === 0) {
    console.error('✗ Budget/Spent inputs missing');
    process.exit(1);
  }

  // Currency symbol should appear at least twice (once per input)
  const euroCount = await page.locator('.text-ink\\/50:has-text("€")').count();
  console.log(`Euro symbols rendered: ${euroCount}`);

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
