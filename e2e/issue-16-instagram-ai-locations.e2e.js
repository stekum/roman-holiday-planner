/**
 * E2E smoke test: #16 Smarter Instagram-Import.
 *
 * Read-only: verifiziert dass das Instagram-Add-Dialog-UI verfügbar ist.
 * Der eigentliche AI+Places-Flow braucht eine echte IG-URL + Gemini-Quota
 * + Places-Quota und wird manuell getestet (AGENTS.md Full-Workflow).
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://stekum.github.io/roman-holiday-planner/beta/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 1200 });
  const page = await ctx.newPage();

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });

  console.log('→ Opening Add-POI menu...');
  await page.click('button[aria-label="Ort hinzufügen"]');
  await page.waitForTimeout(800);

  console.log('→ Clicking Instagram tile...');
  const igTile = page.locator('button:has-text("Instagram")');
  if ((await igTile.count()) === 0) {
    console.error('✗ Instagram-Tile nicht gefunden');
    process.exit(1);
  }
  await igTile.first().click();
  await page.waitForTimeout(800);

  const urlInput = await page.locator('input[placeholder*="instagram.com"]').count();
  const holenBtn = await page.locator('button:has-text("Holen")').count();
  console.log(`  URL-Input: ${urlInput}, Holen-Button: ${holenBtn}`);

  if (urlInput === 0 || holenBtn === 0) {
    console.error('✗ Instagram-Dialog unvollständig');
    process.exit(1);
  }

  // Paste a test URL (invalid on purpose — we don't want real fetch)
  await page.fill('input[placeholder*="instagram.com"]', 'https://www.instagram.com/p/TEST/');
  await page.waitForTimeout(300);

  const enabledHolen = !(await page.locator('button:has-text("Holen")').first().isDisabled());
  console.log(`  Holen-Button enabled nach Input: ${enabledHolen}`);

  if (!enabledHolen) {
    console.error('✗ Holen-Button sollte bei valid-format IG-URL enabled sein');
    process.exit(1);
  }

  await browser.close();
  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
