/**
 * Read-only: zaehlt wie viele DayBriefingCards GLEICHZEITIG im DOM sind.
 * Hypothese (Stefan's "weiter unten"): es sind mehrere, eine pro gespeicherter
 * Firestore-Briefing, nicht nur fuer activeDay.
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);

  // Scrolle runter um Lazy-Load zu triggern
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  // Alle Briefing-Cards im DOM
  const cardPs = page.locator('div.bg-ocker\\/10 p.whitespace-pre-line');
  const count = await cardPs.count();
  console.log(`DayBriefingCards im DOM: ${count}\n`);

  for (let i = 0; i < count; i++) {
    const text = (await cardPs.nth(i).textContent()) ?? '';
    console.log(`--- Card ${i + 1} (${text.length}ch) ---`);
    console.log(text.slice(0, 180).replace(/\n/g, '\\n'));
    console.log('');
  }

  // Zusaetzlich: alle <p> mit whitespace-pre-line — vielleicht sind nicht alle in bg-ocker/10
  const allP = page.locator('p.whitespace-pre-line');
  const allCount = await allP.count();
  console.log(`Alle p.whitespace-pre-line im DOM: ${allCount}`);

  await page.screenshot({ path: '.playwright-results/issue-169-full-scroll.png', fullPage: true });

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
