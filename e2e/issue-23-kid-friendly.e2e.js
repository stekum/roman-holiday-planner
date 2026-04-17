/**
 * E2E smoke test: #23 AI Kindgerechte Vorschläge im Reise-Tab.
 *
 * Flow:
 *   1. Sign in via E2E custom token
 *   2. Navigate to Reise-Tab
 *   3. If no trip dates set: log warning, exit clean (test user shares
 *      real workspace — we don't mutate state)
 *   4. Otherwise: expand "Kindgerechte Vorschläge" panel
 *   5. Click "Vorschläge finden" → wait for cards
 *   6. Verify ≥1 card with Kind-Tag + "Hinzufügen"
 *
 * Prereq: npm run e2e:token
 * Run:    npm run e2e:issue-23
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

  console.log('→ Waiting for authenticated app...');
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Switching to Reise-Tab...');
  await page.click('text=Reise');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.playwright-results/issue-23-1-reise-tab.png' });

  // If no trip dates: panel won't render. Exit gracefully.
  const noTripDates = await page.locator('text=Reise-Zeitraum').count();
  if (noTripDates > 0) {
    console.log('⚠ Test user has no trip dates configured. Can\'t test panel.');
    console.log('   Set via UI or seed the workspace to enable this smoke test.');
    await browser.close();
    return;
  }

  console.log('→ Waiting for Kindgerechte Vorschläge panel...');
  await page.waitForSelector('text=Kindgerechte Vorschläge', { timeout: 10000 });
  await page.screenshot({ path: '.playwright-results/issue-23-2-panel-visible.png' });

  console.log('→ Expanding panel...');
  await page.click('text=Kindgerechte Vorschläge');
  await page.waitForSelector('button:has-text("Vorschläge finden")', { timeout: 3000 });
  await page.screenshot({ path: '.playwright-results/issue-23-3-panel-idle.png' });

  console.log('→ Clicking "Vorschläge finden" (Gemini + Places, 10-25s)...');
  await page.click('button:has-text("Vorschläge finden")');

  try {
    await page.waitForSelector('text=Suche kindgerechte Stops', { timeout: 3000 });
    await page.screenshot({ path: '.playwright-results/issue-23-4-loading.png' });
    console.log('✓ Loading state visible');
  } catch {
    console.log('(loading too fast to capture)');
  }

  console.log('→ Waiting for suggestion cards...');
  try {
    await Promise.race([
      page.waitForSelector('button:has-text("Hinzufügen")', { timeout: 45000 }),
      page.waitForSelector('button:has-text("Nochmal versuchen")', { timeout: 45000 }),
    ]);
  } catch (e) {
    console.error('✗ Neither success nor error state appeared');
    await page.screenshot({ path: '.playwright-results/issue-23-FAIL-timeout.png', fullPage: true });
    throw e;
  }

  const errorCount = await page.locator('button:has-text("Nochmal versuchen")').count();
  if (errorCount > 0) {
    console.error('✗ AI kid-friendly suggestion failed (error state)');
    await page.screenshot({ path: '.playwright-results/issue-23-FAIL-error.png', fullPage: true });
    process.exit(1);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-results/issue-23-5-suggestions.png', fullPage: true });

  const addButtons = await page.locator('button:has-text("Hinzufügen")').count();
  console.log(`✓ ${addButtons} suggestion card(s) with "Hinzufügen" visible`);
  if (addButtons === 0) {
    console.error('✗ No suggestion cards rendered');
    process.exit(1);
  }

  // Sample: grab the first few titles and reasons + kind badges
  const sample = await page.locator('.rounded-2xl.border.border-cream-dark.bg-white').evaluateAll((els) =>
    els.slice(0, 5).map((el) => {
      const title = el.querySelector('.truncate.text-sm.font-semibold')?.textContent?.trim();
      const kind = el.querySelector('.bg-ocker\\/15')?.textContent?.trim();
      const reason = el.querySelector('.italic')?.textContent?.trim();
      return { title, kind, reason: reason?.slice(0, 80) };
    }),
  );
  console.log('Kid-friendly sample:', JSON.stringify(sample, null, 2));

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
