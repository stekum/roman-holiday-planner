import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[DBC #169]')) {
      const ts = Date.now();
      logs.push({ ts, text: t });
      console.log(`  [${ts % 100000}ms] ${t}`);
    }
  });

  const t0 = Date.now();
  await page.goto('https://holiday-planner-beta.web.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  console.log(`nav+ready: ${Date.now() - t0}ms`);
  await page.click('button[aria-label="Reise"]');

  // 7s beobachten mit cardcount zwischendurch
  for (const wait of [300, 300, 400, 500, 500, 1000, 1000, 1000, 2000]) {
    await page.waitForTimeout(wait);
    const cards = await page.locator('div.bg-ocker\\/10').count();
    console.log(`  t=${Date.now() - t0}ms cards=${cards}`);
  }

  console.log('\nAll DBC logs:', logs.length);

  // Count distinct MOUNT/UNMOUNT
  const mounts = logs.filter((l) => l.text.includes('MOUNT id=') && !l.text.includes('UNMOUNT'));
  const unmounts = logs.filter((l) => l.text.includes('UNMOUNT'));
  console.log(`MOUNTS: ${mounts.length}`);
  console.log(`UNMOUNTS: ${unmounts.length}`);
  console.log(`Live (mounts - unmounts): ${mounts.length - unmounts.length}`);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
