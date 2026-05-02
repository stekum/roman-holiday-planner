/**
 * i18n initialization. Side-effect import in main.tsx kicks this off.
 *
 * Phase 1 (#122): Header-strings only. Restliche Komponenten-Migration in v3.3.
 *
 * Initial language is read directly from localStorage so the first render
 * already shows the correct language (no DE→EN flicker on reload).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deTranslations from './locales/de.json';
import enTranslations from './locales/en.json';

const STORAGE_KEY = 'rhp:settings';

function readInitialLanguage(): 'de' | 'en' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'de';
    const parsed = JSON.parse(raw) as { uiLanguage?: 'de' | 'en' };
    return parsed.uiLanguage === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: deTranslations },
    en: { translation: enTranslations },
  },
  lng: readInitialLanguage(),
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
