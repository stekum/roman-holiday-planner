/**
 * E2E diagnostic test: #169 AI Tages-Briefing.
 *
 * Triggert einen ECHTEN Gemini-Call auf Beta, intercepted die HTTP-Response
 * und loggt:
 *   - raw response-body (candidates[0].content.parts und text())
 *   - den finalen briefing-String wie er in Firestore landet (ueber console.warn-Log
 *     aus aiDayBriefing.ts oder DOM-Inhalt der DayBriefingCard)
 *   - Console-Output der Seite
 *
 * Ziel: Verifizieren ob deduplicateParagraphs tatsaechlich greift, und wie
 * Gemini die Duplikate strukturiert (mit \n\n, \n oder ganz ohne separator).
 *
 * Nicht-destruktiv: ueberschreibt das Briefing eines Tages auf Beta einmalig
 * mit der Live-Gen. Stefan kann's danach wieder "clearDay"-en.
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
  const ctx = await getAuthenticatedContext(browser);
  const page = await ctx.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(entry);
  });

  const geminiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('generativelanguage.googleapis.com') || url.includes('/generateContent')) {
      try {
        const body = await response.json();
        geminiResponses.push({ url, status: response.status(), body });
        console.log(`[intercepted gemini] ${response.status()} ${url.slice(0, 100)}`);
      } catch (err) {
        console.log(`[intercepted non-json] ${response.status()} ${url.slice(0, 100)}`);
      }
    }
  });

  console.log('→ Navigating to Beta...');
  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Switching to Reise-Tab...');
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(1500);

  const noDates = await page.locator('text=Reise-Zeitraum').count();
  if (noDates > 0) {
    console.log('⚠ Test user has no trip dates — abort');
    await browser.close();
    return;
  }

  // DayTabs sind plain <button> mit Text "Tag N" — versuche reihum bis Tag mit Stops gefunden
  console.log('→ Suche Tag mit Stops...');
  const dayTabButtons = page.locator('button:has-text("Tag "):not(:has-text("Tages"))');
  const dayTabCount = await dayTabButtons.count();
  console.log(`  Anzahl Tag-Buttons: ${dayTabCount}`);

  let foundDayWithStops = false;
  for (let i = 0; i < Math.min(dayTabCount, 10); i++) {
    await dayTabButtons.nth(i).click();
    await page.waitForTimeout(600);
    const briefingBtn = page.locator(
      'button:has-text("Briefing erzeugen"), button:has-text("Briefing aktualisieren")',
    );
    const exists = (await briefingBtn.count()) > 0;
    if (!exists) continue;
    const disabled = await briefingBtn.first().isDisabled();
    if (!disabled) {
      foundDayWithStops = true;
      const tabText = await dayTabButtons.nth(i).textContent();
      console.log(`  ✓ Tag-Button #${i} hat Stops, Briefing-Button enabled. Text: ${tabText?.slice(0, 30)}`);
      break;
    }
  }

  if (!foundDayWithStops) {
    console.log('⚠ Kein Tag mit enabled Briefing-Button gefunden — Test braucht Tag mit Stops');
    await browser.close();
    return;
  }

  await page.screenshot({ path: `${OUT_DIR}/issue-169-before.png`, fullPage: true });

  console.log('→ Trigger Briefing-Erzeugen...');
  const button = page
    .locator('button:has-text("Briefing erzeugen"), button:has-text("Briefing aktualisieren")')
    .first();
  await button.click();

  // Wait for button back-to-enabled (Generation done) OR timeout
  console.log('→ Warte auf Gemini-Response (max 60s)...');
  try {
    await page.waitForFunction(
      () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const genBtn = btns.find(
          (b) =>
            b.textContent?.includes('Briefing erzeugen') ||
            b.textContent?.includes('Briefing aktualisieren'),
        );
        return genBtn && !genBtn.disabled;
      },
      { timeout: 60000 },
    );
  } catch (err) {
    console.log('  ⚠ Timeout — button nicht mehr enabled. Trotzdem weiter.');
  }
  await page.waitForTimeout(2000);

  // Extract visible briefing text from DayBriefingCard
  const briefingParagraph = page.locator('div.bg-ocker\\/10 p.whitespace-pre-line');
  const briefingExists = (await briefingParagraph.count()) > 0;
  let briefingText = null;
  if (briefingExists) {
    briefingText = await briefingParagraph.first().textContent();
  }

  await page.screenshot({ path: `${OUT_DIR}/issue-169-after.png`, fullPage: true });

  console.log('\n==========================================');
  console.log('DIAGNOSTIC-DUMP');
  console.log('==========================================\n');

  console.log(`\n[1] Gemini-Responses intercepted: ${geminiResponses.length}`);
  if (geminiResponses.length > 0) {
    const latest = geminiResponses[geminiResponses.length - 1];
    console.log(`\n[1a] URL: ${latest.url}`);
    console.log(`[1b] Status: ${latest.status}`);
    console.log(`[1c] Body shape:`);
    console.log(`     candidates.length = ${latest.body?.candidates?.length ?? 'N/A'}`);
    const parts = latest.body?.candidates?.[0]?.content?.parts;
    console.log(`     candidates[0].content.parts.length = ${parts?.length ?? 'N/A'}`);
    if (parts && Array.isArray(parts)) {
      parts.forEach((p, idx) => {
        const preview = (p.text ?? '').slice(0, 120).replace(/\n/g, '\\n');
        console.log(`     part[${idx}] (${(p.text ?? '').length} chars): "${preview}${p.text && p.text.length > 120 ? '...' : ''}"`);
      });
      const concatenated = parts.map((p) => p.text ?? '').join('\n');
      console.log(`     concatenated length = ${concatenated.length}`);
      console.log(`     concatenated first 500 chars:`);
      console.log(`     ---`);
      console.log(concatenated.slice(0, 500));
      console.log(`     ---`);
    }
    writeFileSync(
      `${OUT_DIR}/issue-169-gemini-response.json`,
      JSON.stringify(latest.body, null, 2),
    );
    console.log(`\n     Full body saved: ${OUT_DIR}/issue-169-gemini-response.json`);
  }

  console.log(`\n[2] Rendered Briefing in DOM:`);
  if (briefingText) {
    console.log(`    length = ${briefingText.length}`);
    console.log(`    first 500 chars:`);
    console.log(`    ---`);
    console.log(briefingText.slice(0, 500));
    console.log(`    ---`);
    // Detect duplicate paragraphs
    const blocks = briefingText.split(/\n{2,}/).filter((b) => b.trim());
    const uniqueBlocks = new Set(blocks.map((b) => b.trim().toLowerCase().replace(/\s+/g, ' ')));
    console.log(`    \\n\\n-separated blocks: ${blocks.length}`);
    console.log(`    unique blocks: ${uniqueBlocks.size}`);
    if (blocks.length !== uniqueBlocks.size) {
      console.log(`    🚨 DUPLIKATE IM DOM GEFUNDEN: ${blocks.length - uniqueBlocks.size} redundant`);
    }
  } else {
    console.log(`    (keine DayBriefingCard im DOM)`);
  }

  console.log(`\n[3] Relevante Console-Logs (AI Briefing):`);
  const aiLogs = consoleLogs.filter((l) => l.includes('AI Briefing'));
  aiLogs.forEach((l) => console.log(`    ${l}`));
  if (aiLogs.length === 0) console.log('    (keine AI-Briefing-Logs — Dedup-Pass hat NICHT gegriffen)');

  console.log(`\n[4] Alle Console-Logs (${consoleLogs.length} total, last 20):`);
  consoleLogs.slice(-20).forEach((l) => console.log(`    ${l}`));

  writeFileSync(`${OUT_DIR}/issue-169-console.log`, consoleLogs.join('\n'));

  await browser.close();
  console.log('\n==========================================');
  console.log('DONE. Artifacts in', OUT_DIR);
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
