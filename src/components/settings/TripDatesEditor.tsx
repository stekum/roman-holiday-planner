import { Calendar } from 'lucide-react';
import { dayCount } from '../../lib/dates';

interface Props {
  tripStart: string;
  tripEnd: string;
  onChange: (start: string, end: string) => void;
}

export function TripDatesEditor({ tripStart, tripEnd, onChange }: Props) {
  const count = dayCount(tripStart, tripEnd);
  const invalid = count === 0;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-terracotta" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reise-Zeitraum
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Anreise
          </span>
          <input
            type="date"
            value={tripStart}
            max={tripEnd}
            onChange={(e) => onChange(e.target.value, tripEnd)}
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Abreise
          </span>
          <input
            type="date"
            value={tripEnd}
            min={tripStart}
            onChange={(e) => onChange(tripStart, e.target.value)}
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
        </label>
      </div>
      <p className={`mt-3 text-sm ${invalid ? 'text-terracotta' : 'text-ink/60'}`}>
        {invalid
          ? 'Abreise muss nach der Anreise liegen.'
          : count === 1
            ? '1 Tag geplant.'
            : `${count} Tage geplant.`}
      </p>
    </section>
  );
}
