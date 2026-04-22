import { chromium } from 'playwright';
import { getAuthenticatedContext } from './auth-helper.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await getAuthenticatedContext(browser, { width: 390, height: 3000 });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[DBC169]')) {
      logs.push(t);
      console.log(`  ${t}`);
    }
  });

  await page.goto(`https://holiday-planner-beta.web.app/?_cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Ort hinzufügen"]', { timeout: 30000 });
  await page.click('button[aria-label="Reise"]');
  await page.waitForTimeout(2000);

  // 10 Tag-Switches — stress-test
  for (const n of [5, 1, 5, 6, 5, 2, 5, 3, 5, 4, 5]) {
    console.log(`\n>> switch to Tag ${n}`);
    await page.locator(`button:has-text("Tag ${n}")`).first().click();
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);

  console.log('\n--- Summary ---');
  const mounts = logs.filter((l) => l.includes('MOUNT') && !l.includes('UNMOUNT'));
  const unmounts = logs.filter((l) => l.includes('UNMOUNT'));
  console.log(`Mounts: ${mounts.length}, Unmounts: ${unmounts.length}, Live: ${mounts.length - unmounts.length}`);

  const previews = new Map();
  for (const l of mounts) {
    const m = l.match(/preview="([^"]+)"/);
    if (m) previews.set(m[1], (previews.get(m[1]) ?? 0) + 1);
  }
  console.log('\nUnique preview patterns:');
  for (const [p, n] of previews) console.log(`  ${n}× "${p}"`);

  const cards = await page.locator('div.bg-ocker\\/10').count();
  console.log(`\nDOM Cards: ${cards}`);

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
