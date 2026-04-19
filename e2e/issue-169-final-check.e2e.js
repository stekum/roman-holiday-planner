import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto(`https://stekum.github.io/roman-holiday-planner/beta/?_cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(2000);

  console.log('Baseline:', await page.locator('div.bg-ocker\\/10').count(), 'cards');

  for (const n of [5, 1, 5, 6, 5, 2, 5, 3, 5, 4, 5]) {
    await page.locator(`button:has-text("Tag ${n}")`).first().click();
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1500);

  const final = await page.locator('div.bg-ocker\\/10').count();
  console.log(`Final after 11 switches: ${final} cards`);
  if (final !== 1) {
    console.log('❌ FAIL: expected 1, got', final);
    process.exit(1);
  }
  console.log('✅ PASS');
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
