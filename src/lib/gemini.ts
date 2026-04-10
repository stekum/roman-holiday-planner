/**
 * Google Gemini API client — lazy-initialized singleton.
 *
 * Uses Gemini 2.5 Flash for cost-effective AI features.
 * Requires VITE_GEMINI_API_KEY in .env.local.
 *
 * All AI features (day planner, NL search, briefing, etc.) import
 * getModel() from here.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

const env = import.meta.env;

export const isGeminiConfigured = !!(env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

let client: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (!isGeminiConfigured) {
    throw new Error('Gemini API key not set. Add VITE_GEMINI_API_KEY to .env.local');
  }
  if (model) return model;

  client = new GoogleGenerativeAI((env.VITE_GEMINI_API_KEY as string).trim());
  model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  return model;
}

/**
 * Quick smoke test — call from browser console:
 *   import('/src/lib/gemini.ts').then(m => m.smokeTest())
 */
export async function smokeTest(): Promise<string> {
  const m = getGeminiModel();
  const result = await m.generateContent('Sag "Ciao Roma!" auf Italienisch und Deutsch.');
  return result.response.text();
}
