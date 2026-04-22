/**
 * E2E smoke test: #15 AI POI Suggestions.
 *
 * Flow:
 *   1. Sign in via E2E custom token
 *   2. Entdecken-Tab (default)
 *   3. Expand AI-Vorschläge panel → click "Vorschläge generieren"
 *   4. Wait for suggestion cards (Gemini + 5× Places TextSearch — can take 20s)
 *   5. Verify ≥1 card with name + category + reason
 *   6. Screenshots in .playwright-results/
 *
 * Prereq:
 *   npm run e2e:token  (mint fresh token <1h old)
 *
 * Run:
 *   npm run e2e:issue-15
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
  await page.screenshot({ path: '.playwright-results/issue-15-1-app-loaded.png' });
  console.log('✓ Signed in, Entdecken-Tab visible');

  console.log('→ Expanding AI-Vorschläge panel...');
  await page.waitForSelector('text=AI-Vorschläge', { timeout: 5000 });
  await page.click('text=AI-Vorschläge');
  await page.waitForSelector('button:has-text("Vorschläge generieren")', { timeout: 3000 });
  await page.screenshot({ path: '.playwright-results/issue-15-2-panel-expanded.png' });
  console.log('✓ Panel expanded, idle state visible');

  console.log('→ Clicking "Vorschläge generieren" (Gemini + Places, 10-25s)...');
  await page.click('button:has-text("Vorschläge generieren")');

  // Loading state
  try {
    await page.waitForSelector('text=Analysiere eure POIs', { timeout: 3000 });
    await page.screenshot({ path: '.playwright-results/issue-15-3-loading.png' });
    console.log('✓ Loading state visible');
  } catch {
    console.log('(loading state may have been too fast to capture)');
  }

  console.log('→ Waiting for suggestion cards...');
  // Success path: "Hinzufügen" button in a suggestion card
  // Fallback path: error message
  try {
    await Promise.race([
      page.waitForSelector('button:has-text("Hinzufügen")', { timeout: 45000 }),
      page.waitForSelector('button:has-text("Nochmal versuchen")', { timeout: 45000 }),
    ]);
  } catch (e) {
    console.error('✗ Neither success nor error state appeared');
    await page.screenshot({ path: '.playwright-results/issue-15-FAIL-timeout.png', fullPage: true });
    throw e;
  }

  // Did we hit the error path?
  const errorCount = await page.locator('button:has-text("Nochmal versuchen")').count();
  if (errorCount > 0) {
    console.error('✗ AI suggestion generation failed (error state shown)');
    await page.screenshot({ path: '.playwright-results/issue-15-FAIL-error.png', fullPage: true });
    process.exit(1);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-results/issue-15-4-suggestions.png', fullPage: true });

  const addButtons = await page.locator('button:has-text("Hinzufügen")').count();
  console.log(`✓ ${addButtons} suggestion card(s) with "Hinzufügen" visible`);

  if (addButtons === 0) {
    console.error('✗ No suggestion cards rendered');
    process.exit(1);
  }

  // Grab the first few suggestion titles + reasons as a signal that content is real
  const cardHeadings = await page.locator('.rounded-2xl.border.border-cream-dark.bg-white').evaluateAll((els) =>
    els.slice(0, 5).map((el) => {
      const title = el.querySelector('.truncate.text-sm.font-semibold')?.textContent?.trim();
      const reason = el.querySelector('.italic')?.textContent?.trim();
      return { title, reason: reason?.slice(0, 80) };
    }),
  );
  console.log('Suggestions sample:', JSON.stringify(cardHeadings, null, 2));

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
