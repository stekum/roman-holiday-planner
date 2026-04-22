import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const browser = await chromium.launch({ headless: true });
const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
const page = await ctx.newPage();
await page.goto(`https://holiday-planner-beta.web.app/?_cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('button[aria-label="Ort hinzufügen"]');
await page.click('button[aria-label="Reise"]');
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);

const data = {
  panelByText: await page.locator('text=AI Post-Trip-Analyse').count(),
  btnErzeugen: await page.locator('button:has-text("Post-Trip-Analyse erzeugen")').count(),
  btnAktual: await page.locator('button:has-text("Analyse aktualisieren")').count(),
  bgTerracotta8: await page.locator('div.bg-terracotta\\/8').count(),
  anyTerracotta: await page.locator('[class*="terracotta"]').count(),
  pageHeight: await page.evaluate(() => document.body.scrollHeight),
  title: await page.title(),
};
console.log(JSON.stringify(data, null, 2));

// Snip: full HTML of last third
const html = await page.evaluate(() => document.body.innerHTML.slice(-3000));
console.log('--- last 3000 chars ---');
console.log(html);

await browser.close();
