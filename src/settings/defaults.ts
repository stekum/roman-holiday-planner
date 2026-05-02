import type { Settings } from './types';

/** Palette im Dolce-Vita-Herbst-Ton für Familien-Markierungen. */
export const FAMILY_COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Terracotta', hex: '#C96F4A' },
  { name: 'Olive', hex: '#6B7A3F' },
  { name: 'Ocker', hex: '#D4A24C' },
  { name: 'Burgunder', hex: '#7A2E2E' },
  { name: 'Petrol', hex: '#386A7A' },
  { name: 'Lavendel', hex: '#8A7CA8' },
  { name: 'Senf', hex: '#B88A1E' },
  { name: 'Schiefer', hex: '#4A4E54' },
];

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_SETTINGS: Settings = {
  tripStart: todayIso(),
  tripEnd: todayIso(6),
  families: [
    { id: 'default-a', name: 'Familie 1', color: FAMILY_COLOR_PALETTE[0].hex },
    { id: 'default-b', name: 'Familie 2', color: FAMILY_COLOR_PALETTE[1].hex },
  ],
  uiLanguage: 'de',
};
