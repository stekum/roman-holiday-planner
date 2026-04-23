/**
 * #73 smoke test — verifies the CityConfig UI additions render in Settings:
 * - CityPicker input "Stadt aus Places befüllen"
 * - Currency dropdown defaults visible
 * - Map-Center read-only field
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
  await page.waitForSelector('button[aria-label^="Trip wechseln"]', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Go to Settings
  const settingsTab = page.locator('button[aria-label="Settings"]').first();
  await settingsTab.click();
  await page.waitForTimeout(1500);

  // Scroll to TripConfig section
  const cityHeadline = page.locator('text="Stadt aus Places befüllen"').first();
  const headlineVisible = await cityHeadline.isVisible().catch(() => false);
  if (headlineVisible) await cityHeadline.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/73-01-settings-tripconfig.png`, fullPage: false });

  // Check CityPicker input
  const cityInput = page.locator('input[aria-label="Stadt suchen"]');
  const cityInputCount = await cityInput.count();

  // Check read-only Map-Center text
  const centerLabel = page.locator('text=/Map-Mittelpunkt/i').first();
  const centerVisible = await centerLabel.isVisible().catch(() => false);

  // Check Currency dropdown has EUR option
  const currencyOption = page.locator('option[value="EUR"]').first();
  const currencyOptionCount = await currencyOption.count();

  console.log('--- SMOKE RESULT ---');
  console.log('headline visible:', headlineVisible);
  console.log('city input count:', cityInputCount);
  console.log('map-mittelpunkt label visible:', centerVisible);
  console.log('currency EUR option count:', currencyOptionCount);
  console.log('pageerror count:', errors.length);
  if (errors.length) console.log('pageerrors:', errors);
  console.log('console.error count:', consoleErrors.length);
  consoleErrors.slice(0, 3).forEach((t) => console.log('  [error]', t));
  console.log('Screenshot:', `${OUT}/73-01-settings-tripconfig.png`);

  await browser.close();
  const ok =
    headlineVisible &&
    cityInputCount === 1 &&
    centerVisible &&
    currencyOptionCount >= 1 &&
    errors.length === 0 &&
    consoleErrors.length === 0;
  process.exit(ok ? 0 : 1);
})();
