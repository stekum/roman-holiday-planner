/** Formats a Date as local YYYY-MM-DD without timezone shifting. */
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Liefert alle ISO-Tage (YYYY-MM-DD) zwischen start und end einschließlich.
 * Rechnet komplett in Lokalzeit, um Off-by-one-Verschiebungen in Zeitzonen
 * östlich von UTC zu vermeiden. Leer wenn end < start oder ungültig.
 */
export function eachDayInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  if (endDate < startDate) return [];

  const days: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(toLocalIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

/** „Mo, 14. Okt" */
export function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()}. ${MONTH_SHORT[d.getMonth()]}`;
}

/** „Tag 1/6" */
export function formatDayIndex(iso: string, allDays: string[]): string {
  const idx = allDays.indexOf(iso);
  if (idx === -1) return '';
  return `Tag ${idx + 1}/${allDays.length}`;
}

export function dayCount(start: string, end: string): number {
  return eachDayInRange(start, end).length;
}
