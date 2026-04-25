/**
 * #240 smoke — verifies that AI-Tagesplan for an Osaka day generates
 * stops in Osaka (not Tokyo). One real Gemini call → ~5-15 cents budget.
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

  // Reise-Tab → Tag 6 (30. Mai = Osaka, Tag-Index 6 weil Tag 1=25.05)
  await page.locator('button[aria-label="Reise"]').first().click();
  await page.waitForTimeout(1500);
  const day6 = page.locator('button:has-text("Tag 6")').first();
  await day6.click();
  await page.waitForTimeout(1500);

  // AI Tagesplan-Modal öffnen
  await page.locator('button:has-text("AI Tagesplan")').first().click();
  await page.waitForTimeout(1200);

  // Prompt eingeben
  const textarea = page.locator('textarea').first();
  await textarea.fill('explore the region close by, easy day, parks and food');
  await page.waitForTimeout(300);

  // Generieren
  const generateBtn = page.locator('button:has-text("Tagesplan generieren")').first();
  await generateBtn.click();

  // Poll for "AI denkt nach…" to disappear (= Gemini done) — bis 60s.
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const stillThinking = await page
      .locator('button:has-text("AI denkt nach")')
      .count();
    if (stillThinking === 0) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000); // settle for stops to render
  await page.screenshot({ path: `${OUT}/issue-240-ai-plan.png`, fullPage: true });

  // Result-Container scrapen — die generated stops haben Reihenfolgen-Nummern
  // Stop-Texte rauslesen (alle li/div mit Stop-Inhalt)
  const fullText = await page.locator('body').textContent();

  // Extrahiere die generierten Stop-Namen — sie erscheinen typischerweise
  // im Result-Box als nummerierte Liste oder als Header
  const tokyoMentions = (fullText.match(/Shinjuku|Tokyo Tower|Asakusa|Roppongi|Shibuya|Harajuku|Ginza|Akihabara|Imperial Palace|Tokyo Metropolitan|Park Hyatt Tokyo/gi) || []).length;
  const osakaMentions = (fullText.match(/Osaka|Umeda|Namba|Dotonbori|Kita-ku|Tennoji|Shinsaibashi|Hotel Granvia/gi) || []).length;
  const kyotoMentions = (fullText.match(/Kyoto|Gion|Kiyomizu|Higashiyama|Arashiyama|Westin Miyako/gi) || []).length;

  console.log('--- #240 SMOKE ---');
  console.log(`Tokyo mentions in body: ${tokyoMentions}`);
  console.log(`Osaka mentions in body: ${osakaMentions}`);
  console.log(`Kyoto mentions in body: ${kyotoMentions}`);
  console.log(`pageerrors: ${errors.length}`);

  // Verdict — Osaka muss dominieren, Tokyo höchstens 1× (Park Hyatt-Hotel-Hinweis o.ä.)
  const passed =
    osakaMentions > tokyoMentions &&
    osakaMentions > 0 &&
    errors.length === 0;
  console.log(`Overall: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Screenshot: ${OUT}/issue-240-ai-plan.png`);

  await browser.close();
  process.exit(passed ? 0 : 1);
})();
