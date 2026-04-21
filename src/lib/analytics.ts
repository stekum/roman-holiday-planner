/**
 * #123: Google Analytics via Firebase Analytics.
 *
 * Init erfolgt einmalig in App.tsx sobald Firebase bereit ist. Ohne
 * `VITE_GA_MEASUREMENT_ID` passiert nichts — Analytics wird nicht
 * initialisiert, alle track-Calls sind no-ops.
 *
 * Opt-Out per `localStorage.setItem('disableAnalytics', '1')` + reload.
 * (DSGVO-Banner/Consent-UI kommt separat.)
 */

import { getApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from 'firebase/analytics';

let analyticsInstance: Analytics | null = null;
let initialized = false;

export type AddPoiMethod = 'search' | 'ai-search' | 'map' | 'manual' | 'instagram';

/** Known events — add here when extending. */
export type AnalyticsEvent =
  | { name: 'add_poi'; params: { method: AddPoiMethod } }
  | { name: 'ai_plan_generated'; params?: { scope?: 'day' } }
  | { name: 'ai_plan_accepted'; params?: { scope?: 'day' } }
  | { name: 'route_optimized'; params?: Record<string, never> }
  | { name: 'filter_used'; params: { field: string; value: string } }
  | { name: 'poi_liked'; params?: Record<string, never> };

function optedOut(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('disableAnalytics') === '1';
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true; // set early to prevent double-init race

  const measurementId = (
    import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  )?.trim();
  if (!measurementId) return; // no tracking without measurement-id
  if (optedOut()) return;
  if (!(await isSupported())) return; // e.g. SSR / unsupported browser

  try {
    analyticsInstance = getAnalytics(getApp());
  } catch (err) {
    console.warn('[analytics] init failed:', err);
    analyticsInstance = null;
  }
}

export function track(
  name: AnalyticsEvent['name'],
  params?: Record<string, unknown>,
): void {
  if (!analyticsInstance) return;
  try {
    logEvent(analyticsInstance, name, params);
  } catch (err) {
    console.warn('[analytics] track failed:', name, err);
  }
}
