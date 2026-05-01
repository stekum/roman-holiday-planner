#!/usr/bin/env node
/**
 * Spike #260 — Phase 2: Generiere 3 Infografiken aus Mock-Trip.
 *
 *   1. Day 2 Tokyo (Tradition & Old Tokyo) — voll bestückter Tag, Watercolor
 *   2. Trip-Übersicht (alle 5 Tage) — Multi-Panel-Layout, Watercolor
 *   3. Day 2 Tokyo nochmal — alternativer Stil (Flat Illustration)
 *
 * Sammelt Cost/Latency/Failure-Daten in metrics.json.
 *
 * HARD COST CAP: 5 USD. Bei NB2 ~$0.04/Bild = ~125 Bilder. Sicher.
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDayPrompt, buildTripPrompt, buildStyleVariationPrompt } from './build-prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const outDir = resolve(repoRoot, 'docs', 'spikes', 'infografik');
mkdirSync(outDir, { recursive: true });

// .env.local laden
try {
  const envContent = readFileSync(resolve(repoRoot, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY fehlt in .env.local');
  process.exit(1);
}

const trip = JSON.parse(readFileSync(resolve(__dirname, 'trip-mock.json'), 'utf-8'));
const ai = new GoogleGenAI({ apiKey });

const MODEL = 'gemini-3.1-flash-image-preview';
const COST_PER_IMAGE = 0.04; // NB2 published price
const COST_CAP = 5.0;

const jobs = [
  { name: 'day2-watercolor', prompt: buildDayPrompt(trip, 1), description: 'Day 2 Tokyo Tradition (watercolor)' },
  { name: 'trip-overview-watercolor', prompt: buildTripPrompt(trip), description: 'Trip-Übersicht 5 Tage (watercolor)' },
  { name: 'day2-flat-illustration', prompt: buildStyleVariationPrompt(trip, 1), description: 'Day 2 Tokyo (flat-illustration alt-style)' },
];

const expectedCost = jobs.length * COST_PER_IMAGE;
console.log(`🍌 Spike #260 Phase 2 — ${jobs.length} Generationen`);
console.log(`   Modell: ${MODEL}`);
console.log(`   Erwarteter Cost: $${expectedCost.toFixed(3)} (Cap: $${COST_CAP})`);
console.log('');

if (expectedCost > COST_CAP) {
  console.error(`❌ Erwarteter Cost $${expectedCost} > Cap $${COST_CAP}`);
  process.exit(1);
}

const metrics = { startedAt: new Date().toISOString(), model: MODEL, jobs: [] };

// Run jobs SEQUENTIELL (parallel könnte Rate-Limits triggern, NB2 ist eh gerade hochbelastet)
for (const job of jobs) {
  console.log(`\n▶ ${job.name}: ${job.description}`);
  const t0 = Date.now();
  let result = { name: job.name, description: job.description, success: false };

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: job.prompt,
    });

    const elapsed = (Date.now() - t0) / 1000;
    const parts = response?.candidates?.[0]?.content?.parts || [];
    let images = 0;
    let textOut = '';

    for (const part of parts) {
      if (part.text) textOut += part.text;
      if (part.inlineData?.data) {
        images += 1;
        const ext = (part.inlineData.mimeType || 'image/png').split('/')[1] || 'png';
        const filename = `${job.name}-${Date.now()}.${ext}`;
        const filepath = resolve(outDir, filename);
        writeFileSync(filepath, Buffer.from(part.inlineData.data, 'base64'));
        result.imagePath = filepath;
        result.imageBytes = part.inlineData.data.length;
      }
    }

    result.success = images > 0;
    result.images = images;
    result.elapsedSeconds = elapsed;
    result.usage = response?.usageMetadata || {};
    result.textOutput = textOut.trim().slice(0, 500) || null;
    result.finishReason = response?.candidates?.[0]?.finishReason || null;

    if (images > 0) {
      console.log(`  ✅ ${elapsed.toFixed(1)}s, ${images} image(s) → ${result.imagePath}`);
    } else {
      console.log(`  ⚠️  ${elapsed.toFixed(1)}s, KEIN Bild (finishReason=${result.finishReason})`);
      if (textOut) console.log(`     Text: ${textOut.slice(0, 200)}`);
    }
  } catch (err) {
    const elapsed = (Date.now() - t0) / 1000;
    result.success = false;
    result.elapsedSeconds = elapsed;
    result.error = err?.message || String(err);
    result.errorStatus = err?.status;
    console.log(`  ❌ ${elapsed.toFixed(1)}s, Error: ${result.error}`);
  }

  metrics.jobs.push(result);

  // Save progress incrementally (long-running, don't lose data on Ctrl-C)
  writeFileSync(resolve(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
}

metrics.completedAt = new Date().toISOString();
metrics.totalImages = metrics.jobs.filter((j) => j.success).length;
metrics.totalCost = metrics.totalImages * COST_PER_IMAGE;
metrics.avgLatency = metrics.jobs.reduce((s, j) => s + (j.elapsedSeconds || 0), 0) / metrics.jobs.length;

writeFileSync(resolve(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

console.log(`\n📊 Summary:`);
console.log(`   Successful: ${metrics.totalImages}/${jobs.length}`);
console.log(`   Total cost: $${metrics.totalCost.toFixed(3)}`);
console.log(`   Avg latency: ${metrics.avgLatency.toFixed(1)}s`);
console.log(`   Metrics: ${resolve(outDir, 'metrics.json')}`);
