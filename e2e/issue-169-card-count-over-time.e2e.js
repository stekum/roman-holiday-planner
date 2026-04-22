import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto('https://holiday-planner-beta.web.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');

  async function count(label) {
    const n = await page.locator('div.bg-ocker\\/10').count();
    console.log(`  ${label}: ${n} DayBriefingCards`);
    return n;
  }

  await page.waitForTimeout(200);
  await count('+200ms');
  await page.waitForTimeout(500);
  await count('+700ms');
  await page.waitForTimeout(1000);
  await count('+1.7s');
  await page.waitForTimeout(2000);
  await count('+3.7s');
  await page.waitForTimeout(3000);
  await count('+6.7s');

  console.log('\nScroll bottom...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await count('+7.7s (scrolled)');

  console.log('\nTab switch to discover and back...');
  await page.click('button[aria-label="Entdecken"]');
  await page.waitForTimeout(500);
  await count('discover-tab');
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);
  await count('back-to-reise');

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
