/**
 * Parses Google Places weekday_text into a short status string.
 * Input: ["Monday: 9:00 AM – 6:00 PM", "Tuesday: 9:00 AM – 6:00 PM", ...]
 */

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_DE: Record<string, string> = {
  Monday: 'Mo', Tuesday: 'Di', Wednesday: 'Mi', Thursday: 'Do',
  Friday: 'Fr', Saturday: 'Sa', Sunday: 'So',
  Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi', Donnerstag: 'Do',
  Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So',
};

export interface OpenStatus {
  /** Short label like "Jetzt geöffnet" or "Geschlossen" */
  label: string;
  /** true = open, false = closed, null = unknown */
  isOpen: boolean | null;
  /** Today's hours, e.g. "09:00–18:00" */
  todayHours?: string;
}

export function getOpenStatus(weekdayText?: string[]): OpenStatus {
  if (!weekdayText || weekdayText.length === 0) {
    return { label: '', isOpen: null };
  }

  const now = new Date();
  const dayIndex = now.getDay(); // 0=Sunday
  const dayNameEN = DAY_NAMES_EN[dayIndex];

  // Find today's entry
  const todayEntry = weekdayText.find((line) => {
    const dayPart = line.split(':')[0]?.trim();
    return dayPart === dayNameEN || DAY_NAMES_DE[dayPart] === DAY_NAMES_DE[dayNameEN];
  });

  if (!todayEntry) {
    return { label: '', isOpen: null };
  }

  const hoursText = todayEntry.split(': ').slice(1).join(': ').trim();

  if (/closed|geschlossen/i.test(hoursText)) {
    return { label: 'Heute geschlossen', isOpen: false };
  }

  if (/24\s*hours|24\s*Stunden/i.test(hoursText)) {
    return { label: 'Rund um die Uhr geöffnet', isOpen: true, todayHours: '24h' };
  }

  // Try to parse time ranges like "9:00 AM – 6:00 PM" or "09:00–18:00"
  const cleanHours = hoursText
    .replace(/\u202F/g, ' ')  // narrow no-break space
    .replace(/\u2009/g, ' '); // thin space

  return {
    label: `Heute: ${cleanHours}`,
    isOpen: true, // Simplified — we show the hours, user can judge
    todayHours: cleanHours,
  };
}

/** Format weekday_text for a tooltip/expanded view */
export function formatWeeklyHours(weekdayText?: string[]): string {
  if (!weekdayText || weekdayText.length === 0) return '';
  return weekdayText
    .map((line) => {
      const parts = line.split(': ');
      const day = parts[0]?.trim() ?? '';
      const hours = parts.slice(1).join(': ').trim();
      const shortDay = DAY_NAMES_DE[day] ?? day.slice(0, 2);
      return `${shortDay}: ${hours}`;
    })
    .join('\n');
}

/**
 * Strukturiertes Pendant zu OpeningHoursPeriod aus dem Google Places SDK.
 * Wir definieren ein eigenes Interface, damit der Helper auch ohne Live-SDK
 * (z.B. in Tests oder bei Mock-Daten) lauffähig ist.
 *
 * Konvention: day 0=Sunday, …, 6=Saturday — identisch zum Places API
 * (regularOpeningHours.periods[].open.day) und zu Date.getDay().
 */
export interface PlacesPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number } | null;
}

/**
 * #300: Filtert Places-Treffer auf einen bestimmten Wochentag (+ optional
 * Uhrzeit) — wird in der Vibes-Suche client-side gegen das strukturierte
 * `regularOpeningHours.periods`-Schema angewandt.
 *
 * Fail-open: wenn keine Periods bekannt sind (Place hat keine Hours-Daten),
 * geben wir true zurück — lieber einen falschen Treffer behalten als einen
 * echten wegfiltern wegen fehlender Metadaten.
 *
 * Edge-Cases:
 *   • 24/7-Places: ein einzelnes Period mit `open.hour=0, open.minute=0` und
 *     `close == null` → immer offen
 *   • Cross-midnight: close.day liegt einen Tag nach open.day — Zeit wird
 *     in Minuten +24h geshiftet
 *   • openAt fehlt → nur Wochentags-Match prüfen
 */
export function isOpenOnDayAt(
  periods: PlacesPeriod[] | undefined | null,
  weekday: number,
  openAt?: string,
): boolean {
  if (!periods || periods.length === 0) return true;
  // 24/7: ein einzelner Period ohne close
  if (periods.length === 1 && !periods[0].close && periods[0].open.hour === 0 && periods[0].open.minute === 0) {
    return true;
  }
  const targetMin = openAt ? parseHHmm(openAt) : null;
  return periods.some((p) => {
    if (p.open.day !== weekday) return false;
    if (targetMin === null) return true;
    const openMin = p.open.hour * 60 + p.open.minute;
    if (!p.close) {
      // Period ohne close: ab open offen bis Tagesende
      return targetMin >= openMin;
    }
    const closeBase = p.close.hour * 60 + p.close.minute;
    // Cross-midnight: close auf nächstem Tag → +24h
    const crossMidnight = p.close.day !== p.open.day;
    const closeMin = crossMidnight ? closeBase + 24 * 60 : closeBase;
    return targetMin >= openMin && targetMin < closeMin;
  });
}

function parseHHmm(s: string): number | null {
  const match = s.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}
