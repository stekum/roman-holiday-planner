import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeInZone, labelForTimezone } from '../settings/tripConfig';

interface Props {
  /** IANA-Zeitzone des Trips (z.B. 'Asia/Tokyo'). */
  tripTimezone: string | undefined;
  /** IANA-Heimat-Zeitzone (z.B. 'Europe/Berlin'). */
  homeTimezone: string;
}

/**
 * #33: Zeigt Trip- + Heimat-Uhrzeit nebeneinander, z.B.
 * "🕐 15:00 Tokyo · 08:00 Berlin". Nur sichtbar wenn beide Zeitzonen
 * unterschiedlich sind. Aktualisiert sich jede Minute (synchronisiert
 * auf vollen Minutenwechsel).
 */
export function DualTimeBadge({ tripTimezone, homeTimezone }: Props) {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const initial = setTimeout(() => {
      setNow(new Date());
      intervalRef.current = setInterval(() => setNow(new Date()), 60_000);
    }, msUntilNextMinute);
    return () => {
      clearTimeout(initial);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!tripTimezone || tripTimezone === homeTimezone) return null;

  const tripTime = formatTimeInZone(now, tripTimezone);
  const homeTime = formatTimeInZone(now, homeTimezone);

  return (
    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/60">
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span className="font-semibold text-ink/80">{tripTime}</span>
      <span className="text-ink/40">{labelForTimezone(tripTimezone)}</span>
      <span className="text-ink/30">·</span>
      <span>{homeTime}</span>
      <span className="text-ink/40">{labelForTimezone(homeTimezone)}</span>
    </div>
  );
}
