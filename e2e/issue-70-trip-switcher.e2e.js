/**
 * #70 Smoke test — TripSwitcher chip visible in header, dropdown opens.
 * Runs against deployed Beta using the e2e-token helper.
 */
import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const OUT = '.playwright-results';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 844 });

  const errors = [];
  const consoleErrors = [];
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // App has live Firestore listeners → 'networkidle' never settles.
  // Wait for the header landmark instead as proof the authenticated view rendered.
  await page.waitForSelector('button[aria-label^="Trip wechseln"]', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Screenshot 1: app loaded, header with TripSwitcher visible
  await page.screenshot({ path: `${OUT}/70-01-header.png`, fullPage: false });

  // Try to find the Trip-Switcher chip by its aria-label
  const chip = page.locator('button[aria-label^="Trip wechseln"]');
  const chipCount = await chip.count();
  const chipText = chipCount > 0 ? await chip.first().textContent() : null;

  // Click to open dropdown
  if (chipCount > 0) {
    await chip.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/70-02-dropdown-open.png`, fullPage: false });

    // Click "Neuen Trip anlegen" (not submitting — just verifying the form renders)
    const newTripBtn = page.locator('button', { hasText: 'Neuen Trip anlegen' });
    if ((await newTripBtn.count()) > 0) {
      await newTripBtn.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/70-03-new-trip-form.png`, fullPage: false });
    }
  }

  console.log('--- SMOKE RESULT ---');
  console.log('chip count:', chipCount);
  console.log('chip text (active trip label):', JSON.stringify(chipText?.trim()));
  console.log('pageerror count:', errors.length);
  if (errors.length) console.log('pageerrors:', errors);
  console.log('console.error count:', consoleErrors.length);
  consoleErrors.slice(0, 5).forEach((t) => console.log('  [error]', t));
  console.log('Screenshots in', OUT);

  await browser.close();
  process.exit(
    chipCount === 1 && errors.length === 0 && consoleErrors.length === 0 ? 0 : 1,
  );
})();
