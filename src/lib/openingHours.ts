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
