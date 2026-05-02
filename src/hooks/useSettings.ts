import { useCallback, useEffect, useState } from 'react';
import i18n from '../i18n';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { Family, Settings } from '../settings/types';

const STORAGE_KEY = 'rhp:settings';

function loadInitial(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      tripStart: parsed.tripStart ?? DEFAULT_SETTINGS.tripStart,
      tripEnd: parsed.tripEnd ?? DEFAULT_SETTINGS.tripEnd,
      families:
        Array.isArray(parsed.families) && parsed.families.length > 0
          ? parsed.families
          : DEFAULT_SETTINGS.families,
      uiLanguage: parsed.uiLanguage === 'en' ? 'en' : 'de',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Keep i18n language in sync with persisted settings (covers initial mount
  // and any later mutation, e.g. dev-tools editing localStorage).
  useEffect(() => {
    const target = settings.uiLanguage ?? 'de';
    if (i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, [settings.uiLanguage]);

  const setTripDates = useCallback((tripStart: string, tripEnd: string) => {
    setSettings((prev) => ({ ...prev, tripStart, tripEnd }));
  }, []);

  const setUiLanguage = useCallback((lng: 'de' | 'en') => {
    setSettings((prev) => ({ ...prev, uiLanguage: lng }));
  }, []);

  const addFamily = useCallback((family: Omit<Family, 'id'>) => {
    setSettings((prev) => ({
      ...prev,
      families: [
        ...prev.families,
        { ...family, id: `fam-${Date.now().toString(36)}` },
      ],
    }));
  }, []);

  const updateFamily = useCallback((id: string, patch: Partial<Omit<Family, 'id'>>) => {
    setSettings((prev) => ({
      ...prev,
      families: prev.families.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }, []);

  const removeFamily = useCallback((id: string) => {
    setSettings((prev) =>
      prev.families.length <= 1
        ? prev
        : { ...prev, families: prev.families.filter((f) => f.id !== id) },
    );
  }, []);

  const getFamily = useCallback(
    (id: string): Family | undefined => settings.families.find((f) => f.id === id),
    [settings.families],
  );

  return {
    settings,
    setTripDates,
    setUiLanguage,
    addFamily,
    updateFamily,
    removeFamily,
    getFamily,
  };
}
