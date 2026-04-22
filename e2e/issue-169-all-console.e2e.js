import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  page.on('console', (msg) => console.log(`  [${msg.type()}] ${msg.text().slice(0, 200)}`));
  page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

  await page.goto(`https://holiday-planner-beta.web.app/?_cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(5000);

  const cards = await page.locator('div.bg-ocker\\/10').count();
  const tagBtns = await page.locator('button:has-text("Tag "):not(:has-text("Tages"))').count();
  console.log(`\nDOM Cards: ${cards}, Tag-Buttons: ${tagBtns}`);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
