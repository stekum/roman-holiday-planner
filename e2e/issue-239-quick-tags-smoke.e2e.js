/**
 * #239 smoke — verifies AI-Tagesplan quick-tags reflect tripConfig.categories.
 */
import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const WS = 'multi-trip-smoke-test';
const OUT = '.playwright-results';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 420, height: 900 });
  await ctx.addInitScript((id) => {
    window.localStorage.setItem('rhp:active-workspace', id);
  }, WS);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label^="Trip wechseln"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Reise-Tab → Tag 1
  await page.locator('button[aria-label="Reise"]').first().click();
  await page.waitForTimeout(1500);
  const day1 = page.locator('button:has-text("Tag 1")').first();
  await day1.click();
  await page.waitForTimeout(1500);

  // AI Tagesplan-Button öffnen
  const aiBtn = page.locator('button:has-text("AI Tagesplan")').first();
  await aiBtn.click();
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${OUT}/issue-239-quick-tags.png`, fullPage: false });

  // Quick-Tags scrapen — nach allen Buttons innerhalb des Modals suchen
  // die einen Emoji-Prefix haben (Form: "EMOJI Label")
  const tagTexts = await page.locator('button').allTextContents();
  // Filter auf typische Quick-Tag-Patterns
  const quickTags = tagTexts
    .map((t) => t.trim())
    .filter((t) => /^[\p{Emoji}🏛️🍕🍨🍝🍹🍣🍜⛩️📍👨‍👩‍👧‍👦🌅🚶 ]/u.test(t))
    .filter((t) => t.length < 40);

  console.log('--- #239 SMOKE ---');
  console.log('Quick-Tags found:', JSON.stringify(quickTags, null, 2));

  // Verdict-Logik
  const hasRomDefaults = quickTags.some((t) =>
    /(Pizza|Gelato|Trattoria|Aperitivo)/i.test(t),
  );
  const hasJapan = quickTags.some((t) => /(Sushi|Ramen|Tempel)/i.test(t));
  const hasUniversal = quickTags.some((t) =>
    /(Kinderfreundlich|Aussicht|Wenig laufen)/i.test(t),
  );

  console.log('Verdict:');
  console.log(`  Rom-Defaults present: ${hasRomDefaults} (expected: false)`);
  console.log(`  Japan-Categories present: ${hasJapan} (expected: true)`);
  console.log(`  Universal tags present: ${hasUniversal} (expected: true)`);
  console.log(`  pageerrors: ${errors.length}`);

  const passed = !hasRomDefaults && hasJapan && hasUniversal && errors.length === 0;
  console.log(`  Overall: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

  await browser.close();
  process.exit(passed ? 0 : 1);
})();
