/**
 * #74 smoke — Verifies the new HomebasesEditor renders on Beta.
 */
import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const OUT = '.playwright-results';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 420, height: 900 });

  const errors = [];
  const consoleErrors = [];
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label^="Trip wechseln"]', { timeout: 20000 });
  await page.waitForTimeout(1000);

  await page.locator('button[aria-label="Settings"]').first().click();
  await page.waitForTimeout(1500);

  const heading = page.locator('h2', { hasText: 'Homebases' }).first();
  const headingVisible = await heading.isVisible().catch(() => false);
  if (headingVisible) await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/74-01-homebases-editor.png`, fullPage: false });

  const addBtn = page.locator('button', { hasText: 'Homebase hinzufügen' }).first();
  const addBtnVisible = await addBtn.isVisible().catch(() => false);

  console.log('--- SMOKE RESULT ---');
  console.log('Heading "Homebases" visible:', headingVisible);
  console.log('"+ Homebase hinzufügen" visible:', addBtnVisible);
  console.log('pageerror count:', errors.length);
  console.log('console.error count:', consoleErrors.length);
  errors.slice(0, 3).forEach((e) => console.log('  [pageerror]', e));
  consoleErrors.slice(0, 3).forEach((e) => console.log('  [error]', e));

  await browser.close();
  const ok = headingVisible && addBtnVisible && errors.length === 0 && consoleErrors.length === 0;
  process.exit(ok ? 0 : 1);
})();
