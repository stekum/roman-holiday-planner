#!/usr/bin/env node
/**
 * Spike #260 — Retry für Day-Karte mit explizitem 600s-Timeout + 1 Retry.
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDayPrompt } from './build-prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const outDir = resolve(repoRoot, 'docs', 'spikes', 'infografik');
mkdirSync(outDir, { recursive: true });

try {
  const envContent = readFileSync(resolve(repoRoot, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const trip = JSON.parse(readFileSync(resolve(__dirname, 'trip-mock.json'), 'utf-8'));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prompt = buildDayPrompt(trip, 1); // Day 2 Tokyo

const TIMEOUT_MS = 600_000; // 10min
const MAX_ATTEMPTS = 2;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const t0 = Date.now();
  console.log(`▶ Attempt ${attempt}/${MAX_ATTEMPTS} — Day-2 watercolor`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const parts = response?.candidates?.[0]?.content?.parts || [];
    let saved = 0;

    for (const part of parts) {
      if (part.inlineData?.data) {
        const filename = `day2-watercolor-retry-${Date.now()}.${(part.inlineData.mimeType || 'image/jpeg').split('/')[1]}`;
        const filepath = resolve(outDir, filename);
        writeFileSync(filepath, Buffer.from(part.inlineData.data, 'base64'));
        console.log(`  ✅ ${elapsed}s, saved ${filepath}`);
        saved += 1;
      }
    }

    if (saved > 0) {
      writeFileSync(resolve(outDir, 'day2-retry-meta.json'), JSON.stringify({
        attempt, elapsedSeconds: Number(elapsed), usage: response.usageMetadata,
        finishReason: response.candidates?.[0]?.finishReason,
      }, null, 2));
      process.exit(0);
    } else {
      console.log(`  ⚠️  ${elapsed}s, no image (finishReason=${response.candidates?.[0]?.finishReason})`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ❌ ${elapsed}s, ${err?.message || err}`);
    if (attempt === MAX_ATTEMPTS) {
      console.log('All attempts failed.');
      process.exit(2);
    }
    console.log('  Retrying in 10s...');
    await new Promise((r) => setTimeout(r, 10_000));
  }
}
