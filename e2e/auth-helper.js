/**
 * Playwright helper: returns an authenticated BrowserContext by injecting
 * a Firebase Custom Token via sessionStorage before page load. The app's
 * useAuth.ts hook picks up `rhp:e2e-token` on mount and calls
 * signInWithCustomToken, so the page lands directly on the authenticated
 * view instead of the Sign-In gate.
 *
 * Token source: `.playwright-results/e2e-token.txt` written by
 * `scripts/mint-e2e-token.mjs`. Mint a fresh one before running tests —
 * tokens expire after 1 hour.
 *
 * Usage:
 *   const { chromium } = require('playwright');
 *   const { getAuthenticatedContext } = require('./auth-helper');
 *   const browser = await chromium.launch();
 *   const ctx = await getAuthenticatedContext(browser, { width: 390, height: 844 });
 *   const page = await ctx.newPage();
 *   await page.goto('https://stekum.github.io/roman-holiday-planner/beta/');
 *   // page is signed in as the E2E test user
 */

const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const TOKEN_FILE = resolve(__dirname, '..', '.playwright-results', 'e2e-token.txt');

function loadToken() {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(
      `E2E token file not found at ${TOKEN_FILE}. ` +
        `Run: node scripts/mint-e2e-token.mjs`,
    );
  }
  const token = readFileSync(TOKEN_FILE, 'utf8').trim();
  if (!token) throw new Error(`E2E token file is empty: ${TOKEN_FILE}`);
  return token;
}

/**
 * Create a BrowserContext that will auto-sign-in on first navigation.
 * @param {import('playwright').Browser} browser
 * @param {{ width?: number, height?: number }} [viewport]
 * @returns {Promise<import('playwright').BrowserContext>}
 */
async function getAuthenticatedContext(browser, viewport) {
  const token = loadToken();
  const ctx = await browser.newContext({
    viewport: viewport || { width: 390, height: 844 },
  });
  await ctx.addInitScript((t) => {
    window.sessionStorage.setItem('rhp:e2e-token', t);
  }, token);
  return ctx;
}

module.exports = { getAuthenticatedContext, loadToken, TOKEN_FILE };
