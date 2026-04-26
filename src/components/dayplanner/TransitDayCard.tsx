import { ArrowRight, Clock, MapPin, Train } from 'lucide-react';
import type { TransitDay } from '../../settings/types';

interface Props {
  transitDay: TransitDay;
}

/**
 * #78 Replacement-View für den DayPlanner an Transit-Tagen. Zeigt nur
 * Reisedaten — kein POI-Routing, keine Map, kein AI-Tagesplan.
 *
 * Bewusst simple Karte: Stefan kommt im Zug an und sieht in ≤3 Sekunden
 * was er wissen muss (Mode + Abfahrt + Ankunft + Sitz). Für die ganzen
 * AI-Features ist auf Transit-Tagen einfach nichts zu tun.
 */
export function TransitDayCard({ transitDay }: Props) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-ocker-light/40 to-cream p-6 shadow-sm shadow-ink/5 ring-1 ring-ocker/30">
      <div className="mb-4 flex items-center gap-2">
        <Train className="h-6 w-6 text-olive-dark" />
        <h2
          className="text-2xl text-olive-dark"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reisetag
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-lg text-ink">
        <span className="font-semibold">{transitDay.fromCity}</span>
        <ArrowRight className="h-5 w-5 text-ink/40" />
        <span className="font-semibold">{transitDay.toCity}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-olive-dark">
          {transitDay.mode}
        </span>
        {transitDay.departure && (
          <span className="inline-flex items-center gap-1 text-ink/60">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wider">Ab</span>
            <span className="font-mono">{transitDay.departure}</span>
          </span>
        )}
        {transitDay.arrival && (
          <span className="inline-flex items-center gap-1 text-ink/60">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wider">An</span>
            <span className="font-mono">{transitDay.arrival}</span>
          </span>
        )}
      </div>

      {transitDay.info && (
        <div className="mt-4 rounded-2xl bg-white/70 p-3 text-sm text-ink/80">
          <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-ink/50">
            <MapPin className="h-3 w-3" />
            Reservation
          </div>
          {transitDay.info}
        </div>
      )}

      <p className="mt-5 text-xs text-ink/50">
        Tagesprogramm ist heute pausiert. POIs für andere Tage findest du in den Tab-Wechslern oben.
      </p>
    </section>
  );
}
