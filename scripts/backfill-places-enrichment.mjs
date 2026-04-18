#!/usr/bin/env node
/**
 * Backfill POIs mit Places-API-(New)-Enrichment:
 *   - priceRange (konkrete Betraege)
 *   - primaryType / primaryTypeDisplayName (Cuisine-Tags)
 *   - aiSummary (falls noch nicht gefetcht)
 *
 * Iteriert alle POIs in allen Workspaces, die einen placeId haben aber
 * noch kein priceRange-Feld. Schreibt die neuen Felder zurueck per
 * Firestore Admin SDK.
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=... node scripts/backfill-places-enrichment.mjs --dry-run
 *   GOOGLE_MAPS_API_KEY=... node scripts/backfill-places-enrichment.mjs --apply
 *
 * Falls GOOGLE_MAPS_API_KEY nicht gesetzt: liest VITE_GOOGLE_MAPS_API_KEY
 * aus .env.local im Projekt-Root.
 *
 * Requires:
 *   - service-account.json (gleicher Ort wie mint-e2e-token.mjs)
 *   - Places API (New) aktiviert im Google Cloud Console
 *
 * Rate-Limit: 250ms Pause zwischen Requests (vorsichtig, nicht bei Quota).
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const DRY_RUN = !process.argv.includes('--apply');
const RATE_LIMIT_MS = 250;

function resolveApiKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY;
  const envPath = resolve(projectRoot, '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/^VITE_GOOGLE_MAPS_API_KEY\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('GOOGLE_MAPS_API_KEY env var nicht gesetzt und .env.local hat kein VITE_GOOGLE_MAPS_API_KEY.');
}

function resolveServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  const fallback = resolve(projectRoot, 'service-account.json');
  if (existsSync(fallback)) return fallback;
  throw new Error('service-account.json nicht gefunden. Siehe scripts/mint-e2e-token.mjs Header.');
}

let loggedFirstError = false;

async function fetchEnrichment(placeId, apiKey) {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'generativeSummary.overview.text',
          'editorialSummary.text',
          'priceRange',
          'primaryType',
          'primaryTypeDisplayName',
        ].join(','),
      },
    });
    if (!res.ok) {
      if (!loggedFirstError) {
        loggedFirstError = true;
        const body = await res.text();
        console.error(`\n  ✗ API response ${res.status}: ${body.slice(0, 300)}\n`);
        if (res.status === 403) {
          console.error('  Tipp: API-Key ist vermutlich HTTP-Referrer-restricted (client-only).');
          console.error('  Fuer Server-Nutzung: unrestrictierten/IP-restricted Key in Cloud Console erstellen,');
          console.error('  oder temporaer die Restrictions entfernen.\n');
        }
      }
      return null;
    }
    const data = await res.json();
    const aiSummary =
      data.generativeSummary?.overview?.text ??
      data.editorialSummary?.text ??
      undefined;

    const parseMoney = (m) => {
      if (!m) return {};
      const amount = m.units ? parseInt(m.units, 10) : undefined;
      return {
        amount: Number.isFinite(amount) ? amount : undefined,
        currencyCode: m.currencyCode,
      };
    };
    const s = parseMoney(data.priceRange?.startPrice);
    const e = parseMoney(data.priceRange?.endPrice);
    const priceRange =
      s.amount !== undefined || e.amount !== undefined
        ? {
            startAmount: s.amount,
            endAmount: e.amount,
            currencyCode: s.currencyCode ?? e.currencyCode,
          }
        : undefined;

    return {
      aiSummary,
      priceRange,
      primaryType: data.primaryType,
      primaryTypeDisplayName: data.primaryTypeDisplayName?.text,
    };
  } catch (err) {
    console.error(`  ✗ fetch error: ${err.message}`);
    return null;
  }
}

function stripUndefined(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

async function main() {
  const credPath = resolveServiceAccount();
  const apiKey = resolveApiKey();
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();
  const workspacesSnap = await db.collection('workspaces').get();
  console.log(`[backfill] ${workspacesSnap.size} Workspace(s) gefunden`);
  console.log(`[backfill] Mode: ${DRY_RUN ? 'DRY-RUN (keine Writes)' : 'APPLY (schreibt)'}`);
  console.log('');

  let total = 0;
  let withPlaceId = 0;
  let needsBackfill = 0;
  let fetched = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const wsDoc of workspacesSnap.docs) {
    const wsId = wsDoc.id;
    const poisSnap = await db.collection(`workspaces/${wsId}/pois`).get();
    console.log(`[${wsId}] ${poisSnap.size} POIs`);
    total += poisSnap.size;

    for (const poiDoc of poisSnap.docs) {
      const poi = poiDoc.data();
      if (!poi.placeId) continue;
      withPlaceId++;

      // Skip if already has priceRange OR primaryType (already enriched)
      if (poi.priceRange || poi.primaryType) {
        skipped++;
        continue;
      }
      needsBackfill++;

      const enrichment = await fetchEnrichment(poi.placeId, apiKey);
      fetched++;
      if (!enrichment) {
        failed++;
        continue;
      }

      const patch = stripUndefined({
        priceRange: enrichment.priceRange,
        primaryType: enrichment.primaryType,
        primaryTypeDisplayName: enrichment.primaryTypeDisplayName,
        // aiSummary nur setzen wenn POI keinen hat
        aiSummary: poi.aiSummary ? undefined : enrichment.aiSummary,
      });

      const hasChanges = Object.keys(patch).length > 0;
      if (!hasChanges) {
        console.log(`  - ${poi.title}: Places lieferte nichts neues`);
        continue;
      }

      const parts = [];
      if (patch.priceRange) parts.push(`priceRange: ${JSON.stringify(patch.priceRange)}`);
      if (patch.primaryTypeDisplayName) parts.push(`type: "${patch.primaryTypeDisplayName}"`);
      if (patch.aiSummary) parts.push(`aiSummary: ${patch.aiSummary.length} chars`);
      console.log(`  ${DRY_RUN ? '~' : '✓'} ${poi.title}: ${parts.join(', ')}`);

      if (!DRY_RUN) {
        await poiDoc.ref.update(patch);
        updated++;
      }

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log('');
  console.log(`[backfill] --- Summary ---`);
  console.log(`  Total POIs:          ${total}`);
  console.log(`  with placeId:        ${withPlaceId}`);
  console.log(`  skipped (already):   ${skipped}`);
  console.log(`  needs backfill:      ${needsBackfill}`);
  console.log(`  fetched from Places: ${fetched}`);
  console.log(`  failed fetches:      ${failed}`);
  console.log(`  ${DRY_RUN ? 'WOULD update' : 'updated'}: ${DRY_RUN ? needsBackfill - failed : updated}`);

  if (DRY_RUN) {
    console.log('');
    console.log('Dry-run beendet. Fuer echtes Backfill: --apply Flag hinzufuegen.');
  }
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err.message);
  process.exit(1);
});
