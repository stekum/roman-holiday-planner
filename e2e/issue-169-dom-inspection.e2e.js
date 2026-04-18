/**
 * Read-only: Inspiziert den DOM um das Triple-Mount zu verstehen.
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  await page.goto('https://stekum.github.io/roman-holiday-planner/beta/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const out = {};
    // Hierarchy von Briefing-Cards: finde die Parent-Struktur jedes bg-ocker/10 p
    const ps = Array.from(document.querySelectorAll('p.whitespace-pre-line'));
    out.totalBriefingPs = ps.length;

    // Wie viele DayPlanner-Root-Divs? (mx-auto max-w-2xl space-y-4 px-4 py-4)
    const dpRoots = Array.from(document.querySelectorAll('div.mx-auto.max-w-2xl'));
    out.dpRootCount = dpRoots.length;

    // Wie viele "AI Tagesplan" Buttons?
    const aiBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
      (b.textContent ?? '').includes('AI Tagesplan'),
    );
    out.aiTagesplanBtnCount = aiBtns.length;

    // Wie viele "Briefing erzeugen" / "Briefing aktualisieren" Buttons?
    const briefingBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
      /Briefing (erzeugen|aktualisieren)/.test(b.textContent ?? ''),
    );
    out.briefingBtnCount = briefingBtns.length;

    // Wie viele DayTabs-Buttons insgesamt (Tag N)?
    const tagBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^Tag \d+/.test((b.textContent ?? '').trim()),
    );
    out.tagBtnCount = tagBtns.length;

    // Wie viele <main>?
    out.mainCount = document.querySelectorAll('main').length;

    // Ancestor-Chain der ersten Card — welche Container darüber liegen?
    if (ps.length > 0) {
      const path = [];
      let el = ps[0].closest('div.bg-ocker\\/10');
      while (el && el !== document.body) {
        const cls = el.className ? el.className.toString().slice(0, 80) : '';
        const tag = el.tagName.toLowerCase();
        path.push(`${tag}.${cls}`);
        el = el.parentElement;
      }
      out.firstCardAncestry = path;
    }

    // Each card's direct parent — sind sie Siblings oder in verschiedenen Baum-Bereichen?
    const cardDivs = Array.from(document.querySelectorAll('div.bg-ocker\\/10'));
    out.cardParentInfo = cardDivs.map((card, idx) => {
      const p = card.parentElement;
      const pRect = p?.getBoundingClientRect();
      return {
        cardIdx: idx,
        parentTag: p?.tagName,
        parentClass: p?.className?.toString().slice(0, 100) ?? '',
        parentBBox: pRect ? { top: Math.round(pRect.top), h: Math.round(pRect.height) } : null,
      };
    });

    return out;
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
