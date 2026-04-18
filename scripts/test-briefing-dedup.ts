#!/usr/bin/env tsx
/**
 * Unit-Test fuer deduplicateParagraphs — bedient #169.
 *
 * Laeuft via: npm run test:briefing-dedup
 * (Intern: npx tsx scripts/test-briefing-dedup.ts)
 *
 * Exit 0 wenn alle Cases PASS. Exit 1 bei irgendeinem FAIL.
 */

import { deduplicateParagraphs } from '../src/lib/briefingDedup';

interface TestCase {
  name: string;
  input: string;
  expected: string;
}

const cases: TestCase[] = [
  {
    name: 'pass-through: kein Duplikat, normale 2-Absatz-Antwort',
    input: 'Guten Morgen!\n\nEs wird warm heute.',
    expected: 'Guten Morgen!\n\nEs wird warm heute.',
  },
  {
    name: 'exakt 3x identische Bloecke → reduziert auf 1',
    input: (() => {
      const block = 'Guten Morgen! Erster Tag in Rom.';
      return [block, block, block].join('\n\n');
    })(),
    expected: 'Guten Morgen! Erster Tag in Rom.',
  },
  {
    name: 'stefans Report-Shape: 3x komplettes Briefing mit 2 Absaetzen',
    input:
      'Guten Morgen! Ihr erster Tag in Rom, der 10. April 2026, startet gemuetlich in Trastevere.\n\n' +
      'Der Nachmittag fuehrt euch zum Petersdom.\n\n' +
      'Guten Morgen! Ihr erster Tag in Rom, der 10. April 2026, startet gemuetlich in Trastevere.\n\n' +
      'Der Nachmittag fuehrt euch zum Petersdom.\n\n' +
      'Guten Morgen! Ihr erster Tag in Rom, der 10. April 2026, startet gemuetlich in Trastevere.\n\n' +
      'Der Nachmittag fuehrt euch zum Petersdom.',
    expected:
      'Guten Morgen! Ihr erster Tag in Rom, der 10. April 2026, startet gemuetlich in Trastevere.\n\n' +
      'Der Nachmittag fuehrt euch zum Petersdom.',
  },
  {
    name: 'einzelner Block ohne Newlines → pass-through',
    input: 'Eine einzelne Zeile ohne Doppelnewline.',
    expected: 'Eine einzelne Zeile ohne Doppelnewline.',
  },
  {
    name: 'Whitespace-Variation desselben Blocks: nur erste Version behalten',
    input: 'Text A.\n\n  Text A.  \n\nText B.',
    expected: 'Text A.\n\nText B.',
  },
  {
    name: 'Case-Variation desselben Blocks: nur erste Version behalten',
    input: 'GUTEN MORGEN.\n\nguten morgen.\n\nGuten Abend.',
    expected: 'GUTEN MORGEN.\n\nGuten Abend.',
  },
  {
    name: 'non-contiguous Duplikat (ABA) — dedup behaelt erste Occurrence, droppt spaetere',
    input: 'Block A.\n\nBlock B.\n\nBlock A.',
    expected: 'Block A.\n\nBlock B.',
  },
  {
    name: 'leer-String → leer-String',
    input: '',
    expected: '',
  },
  {
    name: '2x Duplikat (nicht nur 3x): reduziert auf 1',
    input: 'Gleicher Text.\n\nGleicher Text.',
    expected: 'Gleicher Text.',
  },
];

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const tc of cases) {
  const got = deduplicateParagraphs(tc.input);
  if (got === tc.expected) {
    console.log(`✓ ${tc.name}`);
    passed++;
  } else {
    console.log(`✗ ${tc.name}`);
    console.log(`  expected: ${JSON.stringify(tc.expected)}`);
    console.log(`  got:      ${JSON.stringify(got)}`);
    failed++;
    failures.push(tc.name);
  }
}

console.log('');
console.log(`Result: ${passed}/${cases.length} passed`);

if (failed > 0) {
  console.log(`FAIL — ${failed} Fehler:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('PASS');
process.exit(0);
