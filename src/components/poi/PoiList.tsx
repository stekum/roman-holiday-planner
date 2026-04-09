import type { POI } from '../../data/pois';
import type { Family } from '../../settings/types';
import { InboxBanner } from '../inbox/InboxBanner';
import { PoiCard } from './PoiCard';

interface Props {
  pois: POI[];
  selectedIds: string[];
  allDays: string[];
  /** POI-ID → Tage (ISO), an denen dieser POI im Plan steht. */
  assignedDaysByPoi: Record<string, string[]>;
  getFamily: (id: string) => Family | undefined;
  onLike: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onHighlight: (id: string) => void;
  onLocate: (id: string) => void;
}

export function PoiList({
  pois,
  selectedIds,
  allDays,
  assignedDaysByPoi,
  getFamily,
  onLike,
  onToggleSelect,
  onRemove,
  onEdit,
  onHighlight,
  onLocate,
}: Props) {
  const sorted = [...pois].sort((a, b) => b.createdAt - a.createdAt);
  const inboxCount = pois.filter((p) => p.needsLocation).length;

  const scrollToInbox = () => {
    const el = document.querySelector('[data-inbox-item]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
      <InboxBanner count={inboxCount} onClick={scrollToInbox} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((poi) => (
          <div
            key={poi.id}
            data-inbox-item={poi.needsLocation ? true : undefined}
          >
            <PoiCard
              poi={poi}
              family={getFamily(poi.familyId)}
              selected={selectedIds.includes(poi.id)}
              assignedDays={assignedDaysByPoi[poi.id] ?? []}
              allDays={allDays}
              onLike={onLike}
              onToggleSelect={onToggleSelect}
              onRemove={onRemove}
              onEdit={onEdit}
              onHighlight={onHighlight}
              onLocate={onLocate}
            />
          </div>
        ))}
      </div>

      {pois.length === 0 && (
        <p className="py-12 text-center text-ink/50">
          Noch keine Orte. Nutze den „+"-Button, um einen hinzuzufügen.
        </p>
      )}
    </div>
  );
}
