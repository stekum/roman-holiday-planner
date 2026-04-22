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
    // Finde den Parent-Div, der alle 8 Cards enthält
    const firstCard = document.querySelector('div.bg-ocker\\/10');
    if (!firstCard) return { error: 'no card' };
    const parent = firstCard.parentElement;
    if (!parent) return { error: 'no parent' };

    // Alle direkten Kinder auflisten mit tag + ersten Klassen + ggf. Text
    const children = Array.from(parent.children).map((c, idx) => ({
      idx,
      tag: c.tagName,
      cls: c.className?.toString().slice(0, 120) ?? '',
      textPreview: (c.textContent ?? '').slice(0, 80).replace(/\s+/g, ' '),
    }));

    return {
      parentClass: parent.className,
      childCount: parent.children.length,
      children,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  writeFileSync('.playwright-results/issue-169-dom-raw.json', JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
