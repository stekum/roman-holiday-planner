#!/usr/bin/env node
/**
 * Spike #260 — GPT-Image-2 Vergleichs-Generationen.
 *
 * Apples-to-apples gegen NB2:
 *   1. Day 2 Tokyo (Tradition & Old Tokyo) — voller Walking-Tour-Tag, Watercolor
 *   2. Trip-Übersicht 5 Tage — Multi-Panel-Layout, Watercolor
 *   3. Day 2 Tokyo — alternativer Stil (Flat Illustration)
 *
 * Pricing-Annahme: $0.08/Bild bei standard quality (high quality wäre teurer).
 * Cost-Cap: $1 (~12 Bilder, weit unter dem $5-Spike-Cap).
 *
 * Usage: node scripts/spike-infografik/generate-gpt2.mjs
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDayPrompt, buildTripPrompt, buildStyleVariationPrompt } from './build-prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const outDir = resolve(repoRoot, 'docs', 'spikes', 'infografik', 'gpt2');
mkdirSync(outDir, { recursive: true });

// .env.local laden
try {
  const envContent = readFileSync(resolve(repoRoot, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY fehlt in .env.local');
  console.error('   Lege ihn als OPENAI_API_KEY=sk-... in .env.local an.');
  process.exit(1);
}

const trip = JSON.parse(readFileSync(resolve(__dirname, 'trip-mock.json'), 'utf-8'));
const openai = new OpenAI({ apiKey });

// GPT-Image-2 model identifier — Stand 2026-05
const MODEL = 'gpt-image-2';
const SIZE = '1024x1536'; // portrait, matches our prompt
const QUALITY = 'medium'; // 'low' | 'medium' | 'high' — medium ist Spike-passend
const COST_PER_IMAGE = 0.08; // approx for 1024x1536 medium

const jobs = [
  { name: 'gpt2-day2-watercolor', prompt: buildDayPrompt(trip, 1), description: 'Day 2 Tokyo Tradition (watercolor)' },
  { name: 'gpt2-trip-overview-watercolor', prompt: buildTripPrompt(trip), description: 'Trip-Übersicht 5 Tage (watercolor)' },
  { name: 'gpt2-day2-flat-illustration', prompt: buildStyleVariationPrompt(trip, 1), description: 'Day 2 Tokyo (flat-illustration alt-style)' },
];

console.log(`🎨  Spike #260 — GPT-Image-2 Vergleichs-Spike`);
console.log(`   Modell: ${MODEL}, Size: ${SIZE}, Quality: ${QUALITY}`);
console.log(`   Erwarteter Cost: ~$${(jobs.length * COST_PER_IMAGE).toFixed(2)}`);
console.log('');

const metrics = { startedAt: new Date().toISOString(), model: MODEL, size: SIZE, quality: QUALITY, jobs: [] };

for (const job of jobs) {
  console.log(`\n▶ ${job.name}: ${job.description}`);
  const t0 = Date.now();
  let result = { name: job.name, description: job.description, success: false };

  try {
    const response = await openai.images.generate({
      model: MODEL,
      prompt: job.prompt,
      size: SIZE,
      quality: QUALITY,
      n: 1,
    });

    const elapsed = (Date.now() - t0) / 1000;
    const datum = response?.data?.[0];

    if (datum?.b64_json) {
      const buf = Buffer.from(datum.b64_json, 'base64');
      const filename = `${job.name}-${Date.now()}.png`;
      const filepath = resolve(outDir, filename);
      writeFileSync(filepath, buf);

      result.success = true;
      result.imagePath = filepath;
      result.imageBytes = buf.length;
      result.elapsedSeconds = elapsed;
      result.revisedPrompt = datum.revised_prompt || null;
      result.usage = response.usage || null;

      console.log(`  ✅ ${elapsed.toFixed(1)}s, ${(buf.length / 1024).toFixed(0)} KB → ${filepath}`);
      if (datum.revised_prompt) {
        console.log(`     Revised prompt (gekürzt): ${datum.revised_prompt.slice(0, 200)}...`);
      }
    } else if (datum?.url) {
      // Fallback if API returns URL instead of b64
      result.imageUrl = datum.url;
      result.elapsedSeconds = elapsed;
      console.log(`  ⚠️  ${elapsed.toFixed(1)}s, URL statt b64: ${datum.url}`);
    } else {
      result.elapsedSeconds = elapsed;
      console.log(`  ⚠️  ${elapsed.toFixed(1)}s, kein Bild im Response`);
      console.log(`     Response: ${JSON.stringify(response).slice(0, 500)}`);
    }
  } catch (err) {
    const elapsed = (Date.now() - t0) / 1000;
    result.elapsedSeconds = elapsed;
    result.error = err?.message || String(err);
    result.errorStatus = err?.status || err?.code;
    console.log(`  ❌ ${elapsed.toFixed(1)}s, ${result.error}`);
    if (err?.code === 'invalid_model') {
      console.log(`     Hinweis: Modell-ID "${MODEL}" möglicherweise falsch. Versuche "gpt-image-1" als Fallback?`);
    }
  }

  metrics.jobs.push(result);
  writeFileSync(resolve(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
}

metrics.completedAt = new Date().toISOString();
metrics.totalImages = metrics.jobs.filter((j) => j.success).length;
metrics.totalCostEstimate = metrics.totalImages * COST_PER_IMAGE;
metrics.avgLatency = metrics.jobs.reduce((s, j) => s + (j.elapsedSeconds || 0), 0) / metrics.jobs.length;
writeFileSync(resolve(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

console.log(`\n📊 Summary:`);
console.log(`   Successful: ${metrics.totalImages}/${jobs.length}`);
console.log(`   Estimated cost: $${metrics.totalCostEstimate.toFixed(3)}`);
console.log(`   Avg latency: ${metrics.avgLatency.toFixed(1)}s`);
console.log(`   Metrics: ${resolve(outDir, 'metrics.json')}`);
