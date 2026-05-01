import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityEvent } from '../../settings/types';

interface Props {
  events: ActivityEvent[];
}

const TYPE_LABELS: Record<ActivityEvent['type'], string> = {
  poi_added: 'hinzugefügt',
  poi_removed: 'gelöscht',
  poi_voted: 'gevoted',
  poi_planned: 'in Tagesplan eingefügt',
  poi_unplanned: 'aus Tagesplan entfernt',
  day_cleared: 'Tag geleert',
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return 'gerade eben';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Woche${weeks === 1 ? '' : 'n'}`;
}

/**
 * #50: Live-Feed der letzten Activity-Events im Workspace.
 * Default collapsed mit Counter — Click öffnet die volle Liste (max 50).
 * Wer/Was/Wann pro Eintrag, kompakt.
 */
export function ActivityFeed({ events }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const visible = expanded ? events : events.slice(0, 5);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-ink/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Activity className="h-4 w-4 text-terracotta" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">
          Aktivität
        </h3>
        <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-ink/60">
          {events.length}
        </span>
        <span className="ml-auto text-ink/40">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <ul className="mt-3 space-y-2">
        {visible.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-olive" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-ink">{e.userLabel ?? 'Jemand'}</span>{' '}
              <span className="text-ink/70">{TYPE_LABELS[e.type] ?? e.type}</span>
              {e.poiTitle && (
                <span className="text-ink/70">
                  : <span className="font-medium text-ink">{e.poiTitle}</span>
                </span>
              )}
              {e.detail && e.type === 'poi_voted' && (
                <span className="ml-1 rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">
                  {e.detail}
                </span>
              )}
              <div className="text-[10px] text-ink/40">{relativeTime(e.createdAt)}</div>
            </div>
          </li>
        ))}
      </ul>

      {!expanded && events.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-semibold text-olive-dark hover:text-olive"
        >
          Alle {events.length} anzeigen
        </button>
      )}
    </section>
  );
}
