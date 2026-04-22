import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto(`https://holiday-planner-beta.web.app/?_cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(2000);

  // Tag 2/3/4 haben dayDescription in Firestore, aber tripPlan ist leer — sollten NICHTS zeigen
  for (const n of [2, 3, 4, 5]) {
    await page.locator(`button:has-text("Tag ${n}")`).first().click();
    await page.waitForTimeout(1000);
    const tagesplanBlocks = await page.locator('div.bg-olive\\/10.text-olive-dark:has-text("AI Tagesplan")').count();
    const briefingCards = await page.locator('div.bg-ocker\\/10').count();
    console.log(`Tag ${n}: tagesplan=${tagesplanBlocks}, briefing=${briefingCards}`);
  }
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
