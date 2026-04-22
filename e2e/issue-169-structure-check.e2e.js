import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto('https://holiday-planner-beta.web.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => ({
    briefingCards: document.querySelectorAll('div.bg-ocker\\/10').length,
    routeSummaries: document.querySelectorAll('div.bg-olive\\/10').length,
    tagestourHeadings: Array.from(document.querySelectorAll('h2')).filter((h) => h.textContent.includes('Tagestour')).length,
    kinderVorschlaege: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.includes('Kindgerechte Vorschläge')).length,
    budgetSections: Array.from(document.querySelectorAll('section')).filter((s) => s.textContent.includes('Tagesbudget')).length,
    olLists: document.querySelectorAll('ol.space-y-1').length,
    dayPlannerRoots: document.querySelectorAll('div.mx-auto.max-w-2xl.space-y-4').length,
  }));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
