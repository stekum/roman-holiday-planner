/**
 * Read-only: iteriert ueber alle Day-Tabs, dumpt jeweils den DayBriefingCard-Text.
 * Kein Trigger von Gemini, kein Write. Liefert harte Daten:
 *   - hat Tag N ein Briefing?
 *   - wie lang ist es?
 *   - enthaelt es Duplikate (via \n\n-split + fingerprint)?
 *   - erste 200 chars als Preview
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const OUT_DIR = resolve('.playwright-results');

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 1800 });
  const page = await ctx.newPage();

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);

  const dayTabButtons = page.locator('button:has-text("Tag "):not(:has-text("Tages"))');
  const dayCount = await dayTabButtons.count();
  console.log(`Gefundene Day-Tabs: ${dayCount}\n`);

  const results = [];
  for (let i = 0; i < dayCount; i++) {
    await dayTabButtons.nth(i).click();
    await page.waitForTimeout(800);

    const tabText = (await dayTabButtons.nth(i).textContent()) ?? '';
    // Scroll down, damit die Card im fullPage-Screenshot sichtbar ist
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // DayBriefingCard selector: der <p> mit whitespace-pre-line in der ocker-Card
    const cardP = page.locator('div.bg-ocker\\/10 p.whitespace-pre-line');
    const hasCard = (await cardP.count()) > 0;
    let briefing = null;
    let blocks = 0;
    let uniqueBlocks = 0;
    let firstBlockCount = 0;
    if (hasCard) {
      briefing = (await cardP.first().textContent()) ?? '';
      const arr = briefing.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
      blocks = arr.length;
      const fingerprints = arr.map((b) => b.toLowerCase().replace(/\s+/g, ' '));
      uniqueBlocks = new Set(fingerprints).size;
      // Wie oft taucht der erste Block 1:1 auf?
      firstBlockCount = fingerprints.filter((f) => f === fingerprints[0]).length;
    }

    await page.screenshot({
      path: `${OUT_DIR}/issue-169-tag-${i + 1}.png`,
      fullPage: true,
    });

    const tagNumber = i + 1;
    const summary = {
      tab: tabText.slice(0, 40),
      tagNumber,
      hasCard,
      length: briefing ? briefing.length : 0,
      blocks,
      uniqueBlocks,
      duplicates: hasCard && blocks !== uniqueBlocks,
      firstBlockCount,
      preview: briefing ? briefing.slice(0, 200).replace(/\n/g, '\\n') : null,
      fullText: briefing,
    };
    results.push(summary);

    console.log(`--- Tag ${tagNumber} (${tabText.slice(0, 30)}) ---`);
    if (!hasCard) {
      console.log('  (kein Briefing)');
    } else {
      console.log(`  length=${summary.length}ch, blocks=${blocks}, unique=${uniqueBlocks}, firstBlockCount=${firstBlockCount}`);
      if (summary.duplicates) {
        console.log(`  🚨 DUPLIKATE: ${blocks - uniqueBlocks} redundant`);
      }
      console.log(`  preview: ${summary.preview}`);
    }
    console.log('');
  }

  writeFileSync(`${OUT_DIR}/issue-169-all-briefings.json`, JSON.stringify(results, null, 2));

  console.log('==========================================');
  console.log('SUMMARY');
  console.log('==========================================');
  for (const r of results) {
    const mark = r.duplicates ? '🚨' : r.hasCard ? '✓' : '—';
    console.log(
      `${mark} Tag ${r.tagNumber}: card=${r.hasCard} blocks=${r.blocks} unique=${r.uniqueBlocks} firstBlockCount=${r.firstBlockCount}`,
    );
  }
  console.log(`\nArtifacts: ${OUT_DIR}/issue-169-tag-N.png + issue-169-all-briefings.json`);

  await browser.close();
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
