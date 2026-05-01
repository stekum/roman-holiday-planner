import { Clock } from 'lucide-react';
import { resolveHomeTimezone, labelForTimezone } from '../../settings/tripConfig';

interface Props {
  value: string | undefined;
  onChange: (tz: string) => void;
}

const SUPPORTED = [
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
];

/**
 * #33: Auswahl der Heimat-Zeitzone pro Workspace. Wird genutzt fuer die
 * Dual-Time-Anzeige im Header wenn TripConfig.timezone abweicht.
 * Default: Browser-Locale (resolveHomeTimezone()).
 */
export function HomeTimezoneEditor({ value, onChange }: Props) {
  const effective = resolveHomeTimezone(value);
  // Browser-Default in die Liste mit aufnehmen falls noch nicht drin
  const options = SUPPORTED.includes(effective) ? SUPPORTED : [effective, ...SUPPORTED];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-ink/5">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-terracotta" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">
          Heimat-Zeitzone
        </h3>
      </div>
      <p className="mb-3 text-xs text-ink/60">
        Bei Trips in andere Zeitzonen (z.B. Japan) zeigt der Header zusätzlich
        die aktuelle Uhrzeit daheim — hilft bei Jetlag und Kommunikation.
      </p>
      <label className="block">
        <select
          value={effective}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta focus:bg-white"
        >
          {options.map((tz) => (
            <option key={tz} value={tz}>
              {labelForTimezone(tz)} ({tz})
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
