#!/usr/bin/env node
/**
 * Spike #260 — Phase 1: Smoke-Test für Nano Banana 2 (gemini-3.1-flash-image-preview).
 *
 * Beweist:
 *   - SDK + API-Key funktionieren
 *   - Modell ist erreichbar und gibt ein Bild zurück
 *   - Format/Größe der Response verstanden
 *   - Latenz + roher Cost-Datapoint
 *
 * Usage:  node scripts/spike-infografik/smoke-test.mjs
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const outDir = resolve(repoRoot, 'docs', 'spikes', 'infografik');
mkdirSync(outDir, { recursive: true });

// Lade .env.local manuell (kein dotenv-Dep für so ein einmal-Spike)
const envPath = resolve(repoRoot, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch (e) {
  console.error('⚠️  .env.local nicht lesbar:', e.message);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY nicht gefunden in .env.local');
  console.error('   Lege ihn als GEMINI_API_KEY=... in .env.local an.');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-image-preview';
const PROMPT = 'A watercolor map of Tokyo in vintage travel-guide style, pastel colors, illustrative, with cherry blossom accents.';

console.log(`🍌  Smoke-Test: ${MODEL}`);
console.log(`📝  Prompt: ${PROMPT}\n`);

const ai = new GoogleGenAI({ apiKey });
const t0 = Date.now();

let response;
try {
  response = await ai.models.generateContent({
    model: MODEL,
    contents: PROMPT,
  });
} catch (err) {
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.error(`❌  API-Call fehlgeschlagen nach ${elapsed}s:`);
  console.error(err?.message || err);
  if (err?.status) console.error(`   HTTP-Status: ${err.status}`);
  process.exit(2);
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`✅  Response in ${elapsed}s`);

// Parse response: find inline image data
const parts = response?.candidates?.[0]?.content?.parts || [];
let imageCount = 0;
let textCollected = '';

for (const part of parts) {
  if (part.text) {
    textCollected += part.text;
  } else if (part.inlineData?.data) {
    imageCount += 1;
    const mime = part.inlineData.mimeType || 'image/png';
    const ext = mime.split('/')[1] || 'png';
    const buf = Buffer.from(part.inlineData.data, 'base64');
    const filename = `smoke-test-${Date.now()}.${ext}`;
    const filepath = resolve(outDir, filename);
    writeFileSync(filepath, buf);
    console.log(`🖼   Bild #${imageCount}: ${filepath}`);
    console.log(`     mime=${mime}, size=${(buf.length / 1024).toFixed(1)} KB`);
  }
}

if (textCollected.trim()) {
  console.log(`💬  Text-Anteil: ${textCollected.trim().slice(0, 200)}`);
}

// Cost-Estimate (NB2 published price ~$0.04/Bild)
const usage = response?.usageMetadata || {};
console.log(`\n📊  Usage:`);
console.log(`     promptTokenCount: ${usage.promptTokenCount ?? 'n/a'}`);
console.log(`     candidatesTokenCount: ${usage.candidatesTokenCount ?? 'n/a'}`);
console.log(`     totalTokenCount: ${usage.totalTokenCount ?? 'n/a'}`);
console.log(`     Bilder generiert: ${imageCount}`);
console.log(`     Estimated Cost: ~$${(imageCount * 0.04).toFixed(3)}`);

if (imageCount === 0) {
  console.error('\n❌  Kein Bild im Response — möglicherweise Content-Reject oder falsche responseModalities.');
  console.log('Response-Dump:', JSON.stringify(response, null, 2).slice(0, 2000));
  process.exit(3);
}

console.log(`\n✅  Smoke-Test erfolgreich.`);
