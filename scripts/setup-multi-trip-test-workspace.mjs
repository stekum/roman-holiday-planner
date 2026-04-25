/**
 * Erzeugt einen deterministischen Test-Workspace für den Comprehensive
 * Multi-Trip Smoke (#74-Validation, 2026-04-25). Tokyo / Kyoto / Osaka
 * mit Datums-Ranges + Trip-Config. Idempotent — überschreibt bestehende
 * Daten unter `workspaces/multi-trip-smoke-test`.
 *
 * Run:
 *   node scripts/setup-multi-trip-test-workspace.mjs
 *
 * Cleanup nach dem Test (manuell):
 *   node -e "import('firebase-admin').then(({default: a})=>{a.initializeApp({credential:a.credential.cert(require('./service-account.json'))});a.firestore().doc('workspaces/multi-trip-smoke-test').delete().then(()=>{console.log('deleted');process.exit(0)})})"
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'service-account.json'), 'utf8'),
);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const WORKSPACE_ID = 'multi-trip-smoke-test';

const homebases = [
  {
    name: 'Park Hyatt Tokyo',
    address: '3 Chome-7-1-2 Nishishinjuku, Shinjuku City, Tokyo 163-1055, Japan',
    coords: { lat: 35.6856, lng: 139.6911 },
    placeId: 'ChIJ3-sXl3CMGGAR0aRqvdeFsO0',
    dateRange: { from: '2026-05-25', to: '2026-05-27' },
  },
  {
    name: 'The Westin Miyako Kyoto',
    address: 'Awataguchi Kachocho, Higashiyama Ward, Kyoto, 605-0052, Japan',
    coords: { lat: 35.0116, lng: 135.7681 },
    placeId: 'ChIJVVVVgX0IAWARh-llgYmA-Qw',
    dateRange: { from: '2026-05-28', to: '2026-05-29' },
  },
  {
    name: 'Hotel Granvia Osaka',
    address: '3-1-1 Umeda, Kita-ku, Osaka 530-0001, Japan',
    coords: { lat: 34.7027, lng: 135.4953 },
    placeId: 'ChIJZbTtSVfwAGARDLzlRHFq8a4',
    dateRange: { from: '2026-05-30', to: '2026-05-31' },
  },
];

const docData = {
  createdAt: Date.now(),
  tripPlan: {},
  dayDescriptions: {},
  dayBriefings: {},
  dayBudgets: {},
  postTripAnalysis: '',
  settings: {
    tripStart: '2026-05-25',
    tripEnd: '2026-05-31',
    families: [
      { id: 'fam-test', name: 'Test-Familie', color: '#C96F4A' },
    ],
    homebases,
    tripConfig: {
      city: 'Tokyo',
      country: 'Japan',
      language: 'Deutsch',
      categories: ['Kultur', 'Sushi', 'Ramen', 'Tempel', 'Sonstiges'],
      center: { lat: 35.6764225, lng: 139.650027 },
      defaultZoom: 14,
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
    },
  },
};

await db.collection('workspaces').doc(WORKSPACE_ID).set(docData);

console.log(`✓ workspace ${WORKSPACE_ID} written:`);
console.log(`  trip: ${docData.settings.tripStart} → ${docData.settings.tripEnd}`);
console.log(`  homebases: ${homebases.length}`);
homebases.forEach((hb) => {
  console.log(
    `    - ${hb.name} (${hb.dateRange.from} → ${hb.dateRange.to}) @ ${hb.coords.lat},${hb.coords.lng}`,
  );
});

process.exit(0);
