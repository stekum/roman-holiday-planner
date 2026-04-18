import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=ServiceWorker'] });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  // Disable Service Workers in context
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', {
        get: () => ({ register: () => Promise.reject('SW disabled'), getRegistrations: () => Promise.resolve([]) }),
      });
    }
  });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[DBC #169]') || t.includes('[DP #169]')) {
      logs.push(t);
      console.log(`  ${t}`);
    }
  });

  await page.goto('https://stekum.github.io/roman-holiday-planner/beta/?_cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(8000);
  // Count over multiple samples
  for (const t of [500, 500, 1000]) {
    await page.waitForTimeout(t);
    const c = await page.locator('div.bg-ocker\\/10').count();
    console.log(`    extra-check: cards=${c}`);
  }

  const r = await page.evaluate(async () => ({
    briefingCards: document.querySelectorAll('div.bg-ocker\\/10').length,
    hasSW: !!navigator.serviceWorker,
    swRegs: await (navigator.serviceWorker?.getRegistrations?.() ?? Promise.resolve([])).then((r) => r.length).catch(() => -1),
  }));
  console.log('\nResult:', JSON.stringify(r, null, 2));
  console.log('Mount logs:', logs.length);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
