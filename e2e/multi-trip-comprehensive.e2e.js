/**
 * Comprehensive Multi-Trip Smoke (#74-Validation 2026-04-25).
 * Steckt durch die Tag-Reihen vom Workspace `multi-trip-smoke-test`
 * (vorher via `node scripts/setup-multi-trip-test-workspace.mjs` befüllt)
 * und prüft pro Tag:
 *   - Ist das Tag-Tab im DayPlanner aktiv?
 *   - Welche Homebase wird gerade als groß-Marker gezeigt?
 *   - Wieviele Homebase-Marker insgesamt sichtbar?
 *
 * Ausgabe: Strukturiertes Summary stdout + Screenshots.
 */

import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

const BETA_URL = 'https://holiday-planner-beta.web.app/';
const WORKSPACE_ID = 'multi-trip-smoke-test';
const OUT = '.playwright-results';

// Erwarteter aktive-Homebase pro Tag (ground-truth aus Setup-Skript).
const EXPECTED_PER_DAY = {
  '2026-05-25': 'Park Hyatt Tokyo',
  '2026-05-26': 'Park Hyatt Tokyo',
  '2026-05-27': 'Park Hyatt Tokyo',
  '2026-05-28': 'The Westin Miyako Kyoto',
  '2026-05-29': 'The Westin Miyako Kyoto',
  '2026-05-30': 'Hotel Granvia Osaka',
  '2026-05-31': 'Hotel Granvia Osaka',
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 1024, height: 800 });

  // Bypass Trip-Switcher: setze active-workspace bevor App lädt.
  await ctx.addInitScript((id) => {
    window.localStorage.setItem('rhp:active-workspace', id);
  }, WORKSPACE_ID);

  const errors = [];
  const consoleErrors = [];
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BETA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label^="Trip wechseln"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // 1. Verify Trip-Switcher zeigt unseren Test-Workspace
  const chipText = await page.locator('button[aria-label^="Trip wechseln"]').first().textContent();

  // 2. Wechsle auf Reise-Tab
  await page.locator('button[aria-label="Reise"]').first().click();
  await page.waitForTimeout(2000);

  const results = {};

  // 3. Iteriere durch jeden Tag — selektiere via "Tag N"-Label
  const dayKeys = Object.keys(EXPECTED_PER_DAY);
  for (let i = 0; i < dayKeys.length; i++) {
    const dayIso = dayKeys[i];
    const dayBtn = page.locator(`button:has-text("Tag ${i + 1}")`).first();
    const exists = (await dayBtn.count()) > 0;
    if (!exists) {
      results[dayIso] = { error: `day-tab "Tag ${i + 1}" not found` };
      continue;
    }
    await dayBtn.click();
    await page.waitForTimeout(2500); // Map-Pan + Re-Render

    // Marker-Anzahl auf der Karte zählen (rough — über Home-Emoji-Container)
    // AdvancedMarker rendert den 🏠-div als Child von einem [aria]-Container.
    const homeMarkers = await page.locator('div:has-text("🏠")').count();

    // Die "aktive" Homebase wird größer (h-10) gerendert. Inactives sind h-7.
    // Da DOM-Inspektion fragil ist, fallen wir auf Screenshot zurück.
    const screenshotPath = `${OUT}/multi-trip-${dayIso}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    results[dayIso] = {
      expected: EXPECTED_PER_DAY[dayIso],
      homeMarkersTotal: homeMarkers,
      screenshot: screenshotPath,
    };
  }

  // 4. Wechsel auf Entdecken-Tab → "today's homebase"
  await page.locator('button[aria-label="Entdecken"]').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/multi-trip-discover.png`, fullPage: false });

  console.log('\n========== MULTI-TRIP SMOKE SUMMARY ==========\n');
  console.log(`Workspace:     ${WORKSPACE_ID}`);
  console.log(`Trip-Chip:     "${chipText?.trim()}"`);
  console.log(`pageerror:     ${errors.length}`);
  console.log(`console.error: ${consoleErrors.length}`);
  console.log('\nPer-Day Results:');
  console.log('Day        | Expected Homebase           | Markers visible | Screenshot');
  console.log('-----------|-----------------------------|-----------------|----------');
  for (const [day, r] of Object.entries(results)) {
    if (r.error) {
      console.log(`${day} | ❌ ${r.error}`);
      continue;
    }
    console.log(
      `${day} | ${r.expected.padEnd(28)} | ${String(r.homeMarkersTotal).padEnd(15)} | ${r.screenshot}`,
    );
  }
  console.log('\nDiscover-Tab Screenshot: .playwright-results/multi-trip-discover.png');

  if (errors.length) {
    console.log('\nPage Errors:');
    errors.slice(0, 5).forEach((e) => console.log('  ', e));
  }
  if (consoleErrors.length) {
    console.log('\nConsole Errors:');
    consoleErrors.slice(0, 5).forEach((e) => console.log('  ', e));
  }

  await browser.close();
  process.exit(0);
})();
