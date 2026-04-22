import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=ServiceWorker'] });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
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
    if (t.includes('[DBC169]')) {
      logs.push(t);
      console.log(`  ${t}`);
    }
  });

  await page.goto('https://holiday-planner-beta.web.app/?_cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(8000);

  console.log('\n--- Summary ---');
  const mounts = logs.filter((l) => l.includes('MOUNT'));
  const unmounts = logs.filter((l) => l.includes('UNMOUNT'));
  console.log(`Mounts: ${mounts.length}, Unmounts: ${unmounts.length}, Live: ${mounts.length - unmounts.length}`);

  console.log('\nUnique previews:');
  const previews = new Map();
  for (const l of mounts) {
    const m = l.match(/preview="([^"]+)"/);
    if (m) previews.set(m[1], (previews.get(m[1]) ?? 0) + 1);
  }
  for (const [p, n] of previews) console.log(`  ${n}× "${p}"`);

  const cards = await page.locator('div.bg-ocker\\/10').count();
  console.log(`\nDOM Cards: ${cards}`);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
