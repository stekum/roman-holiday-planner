import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';
import { writeFileSync } from 'node:fs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto('https://holiday-planner-beta.web.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div.bg-ocker\\/10'));
    return cards.map((c, i) => ({
      idx: i,
      outerHTML_length: c.outerHTML.length,
      outerHTML: c.outerHTML,
    }));
  });

  for (const c of result) {
    console.log(`=== Card ${c.idx} (${c.outerHTML_length}ch) ===`);
    console.log(c.outerHTML.slice(0, 500));
    console.log('');
  }

  // Check: sind Card 0, 1, 2 strikt identisch?
  if (result.length >= 3) {
    console.log('Card 0 === Card 1?', result[0].outerHTML === result[1].outerHTML);
    console.log('Card 0 === Card 2?', result[0].outerHTML === result[2].outerHTML);
    console.log('Card 1 === Card 2?', result[1].outerHTML === result[2].outerHTML);
  }

  writeFileSync('.playwright-results/issue-169-cards-html.json', JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
