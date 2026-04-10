import { Grid3x3, List } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family, Homebase } from '../../settings/types';
import { InboxBanner } from '../inbox/InboxBanner';
import { PoiCard, type PoiCardProps } from './PoiCard';

export type ViewMode = 'grid' | 'compact';

interface Props {
  pois: POI[];
  selectedIds: string[];
  allDays: string[];
  assignedDaysByPoi: Record<string, string[]>;
  getFamily: (id: string) => Family | undefined;
  onLike: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onHighlight: (id: string) => void;
  onSetAsHomebase: (id: string) => void;
  homebase?: Homebase;
  onLocate: (id: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
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
  onSetAsHomebase,
  homebase,
  onLocate,
  viewMode,
  onViewModeChange,
}: Props) {
  const sorted = [...pois].sort((a, b) => b.createdAt - a.createdAt);
  const inboxCount = pois.filter((p) => p.needsLocation).length;

  const scrollToInbox = () => {
    const el = document.querySelector('[data-inbox-item]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sharedProps = (poi: POI): PoiCardProps => ({
    poi,
    family: getFamily(poi.familyId),
    selected: selectedIds.includes(poi.id),
    assignedDays: assignedDaysByPoi[poi.id] ?? [],
    allDays,
    compact: viewMode === 'compact',
    onLike,
    onToggleSelect,
    onRemove,
    onEdit,
    onHighlight,
    onSetAsHomebase,
    homebase,
    onLocate,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink/50">
          {pois.length} {pois.length === 1 ? 'Ort' : 'Orte'}
        </span>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm shadow-ink/5">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`rounded-full p-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-terracotta text-white'
                : 'text-ink/40 hover:text-ink'
            }`}
            aria-label="Grid-Ansicht"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('compact')}
            className={`rounded-full p-1.5 transition ${
              viewMode === 'compact'
                ? 'bg-terracotta text-white'
                : 'text-ink/40 hover:text-ink'
            }`}
            aria-label="Listen-Ansicht"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <InboxBanner count={inboxCount} onClick={scrollToInbox} />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((poi) => (
            <div
              key={poi.id}
              data-inbox-item={poi.needsLocation ? true : undefined}
            >
              <PoiCard {...sharedProps(poi)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((poi) => (
            <div
              key={poi.id}
              data-inbox-item={poi.needsLocation ? true : undefined}
            >
              <PoiCard {...sharedProps(poi)} />
            </div>
          ))}
        </div>
      )}

      {pois.length === 0 && (
        <p className="py-12 text-center text-ink/50">
          Noch keine Orte. Nutze den „+"-Button, um einen hinzuzufügen.
        </p>
      )}
    </div>
  );
}
