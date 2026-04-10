/**
 * Gemini AI via Firebase AI Logic — server-side proxied.
 *
 * The API key is managed by Firebase (never in the client bundle).
 * No VITE_GEMINI_API_KEY needed anymore.
 *
 * Requires: Firebase AI Logic enabled in the Firebase Console.
 */

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { getFirebase } from '../firebase/firebase';

export const isGeminiConfigured = true; // Always available when Firebase is configured

let model: ReturnType<typeof getGenerativeModel> | null = null;

export function getGeminiModel() {
  if (model) return model;

  const { app } = getFirebase();
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
  return model;
}
