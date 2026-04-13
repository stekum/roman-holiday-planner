import { useMemo, useState } from 'react';
import { Filter, Grid3x3, List, X } from 'lucide-react';
import type { POI } from '../../data/pois';
import { CATEGORIES, CATEGORY_EMOJI, type Category } from '../../data/pois';
import type { Family, Homebase } from '../../settings/types';
import { haversineKm } from '../../lib/geo';
import { InboxBanner } from '../inbox/InboxBanner';
import { PoiCard, type PoiCardProps } from './PoiCard';

export type ViewMode = 'grid' | 'compact';
type SortKey = 'date' | 'likes' | 'distance' | 'name';

interface Props {
  pois: POI[];
  selectedIds: string[];
  allDays: string[];
  assignedDaysByPoi: Record<string, string[]>;
  families: Family[];
  getFamily: (id: string) => Family | undefined;
  onLike: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onHighlight: (id: string) => void;
  onSetAsHomebase: (id: string) => void;
  homebase?: Homebase;
  onLocate: (id: string) => void;
  onStreetView?: (id: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  // Filter state — controlled by parent so the map stays in sync
  filterCategory: Category | null;
  filterFamily: string | null;
  filterInbox: boolean;
  showFilters: boolean;
  onFilterCategoryChange: (cat: Category | null) => void;
  onFilterFamilyChange: (fam: string | null) => void;
  onFilterInboxChange: (v: boolean) => void;
  onShowFiltersChange: (v: boolean) => void;
  onClearFilters: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Neueste zuerst' },
  { key: 'likes', label: 'Beliebteste' },
  { key: 'distance', label: 'Nächste (Homebase)' },
  { key: 'name', label: 'A–Z' },
];

export function PoiList({
  pois,
  selectedIds,
  allDays,
  assignedDaysByPoi,
  families,
  getFamily,
  onLike,
  onToggleSelect,
  onRemove,
  onEdit,
  onHighlight,
  onSetAsHomebase,
  homebase,
  onLocate,
  onStreetView,
  viewMode,
  onViewModeChange,
  filterCategory,
  filterFamily,
  filterInbox,
  showFilters,
  onFilterCategoryChange,
  onFilterFamilyChange,
  onFilterInboxChange,
  onShowFiltersChange,
  onClearFilters,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');

  const activeFilterCount =
    (filterCategory ? 1 : 0) + (filterFamily ? 1 : 0) + (filterInbox ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...pois];
    if (filterCategory) list = list.filter((p) => p.category === filterCategory);
    if (filterFamily) list = list.filter((p) => p.familyId === filterFamily);
    if (filterInbox) list = list.filter((p) => p.needsLocation);
    return list;
  }, [pois, filterCategory, filterFamily, filterInbox]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortKey) {
      case 'date':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      case 'likes':
        return list.sort((a, b) => b.likes - a.likes);
      case 'name':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'de'));
      case 'distance':
        if (!homebase?.coords) return list.sort((a, b) => b.createdAt - a.createdAt);
        return list.sort((a, b) => {
          const distA = a.coords ? haversineKm(homebase.coords, a.coords) : 9999;
          const distB = b.coords ? haversineKm(homebase.coords, b.coords) : 9999;
          return distA - distB;
        });
      default:
        return list;
    }
  }, [filtered, sortKey, homebase?.coords]);

  const inboxCount = pois.filter((p) => p.needsLocation).length;

  const scrollToInbox = () => {
    onFilterInboxChange(true);
    onShowFiltersChange(true);
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
    onStreetView,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-3 pb-24">
      {/* Toolbar: count + filter toggle + sort + view mode */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-ink/50">
          {sorted.length}{filtered.length !== pois.length ? `/${pois.length}` : ''} {pois.length === 1 ? 'Ort' : 'Orte'}
        </span>

        <button
          type="button"
          onClick={() => onShowFiltersChange(!showFilters)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            activeFilterCount > 0
              ? 'bg-terracotta text-white'
              : 'bg-white text-ink/60 shadow-sm hover:text-ink'
          }`}
        >
          <Filter className="h-3 w-3" />
          Filter
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white/30 px-1.5 text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink/60 shadow-sm outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-1 rounded-full bg-white p-1 shadow-sm shadow-ink/5">
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

      {/* Filter chips */}
      {showFilters && (
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm shadow-ink/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Kategorie
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="flex items-center gap-1 text-xs text-terracotta hover:underline"
              >
                <X className="h-3 w-3" />
                Alle zurücksetzen
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = filterCategory === cat;
              const count = pois.filter((p) => p.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onFilterCategoryChange(active ? null : cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? 'bg-ocker text-white shadow-md'
                      : 'bg-cream text-ink/60 hover:bg-cream-dark'
                  }`}
                >
                  {CATEGORY_EMOJI[cat]} {cat} ({count})
                </button>
              );
            })}
          </div>

          {families.length > 1 && (
            <>
              <span className="block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Familie
              </span>
              <div className="flex flex-wrap gap-1.5">
                {families.map((fam) => {
                  const active = filterFamily === fam.id;
                  const count = pois.filter((p) => p.familyId === fam.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => onFilterFamilyChange(active ? null : fam.id)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        active
                          ? 'text-white shadow-md'
                          : 'bg-cream text-ink/60 hover:bg-cream-dark'
                      }`}
                      style={active ? { backgroundColor: fam.color } : undefined}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: active ? '#fff' : fam.color }}
                      />
                      {fam.name} ({count})
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {inboxCount > 0 && (
            <button
              type="button"
              onClick={() => onFilterInboxChange(!filterInbox)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                filterInbox
                  ? 'bg-terracotta text-white shadow-md'
                  : 'bg-cream text-ink/60 hover:bg-cream-dark'
              }`}
            >
              📍 Nur Inbox ({inboxCount})
            </button>
          )}
        </div>
      )}

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

      {sorted.length === 0 && pois.length > 0 && (
        <div className="rounded-3xl bg-white p-8 text-center text-ink/50 shadow-sm">
          Keine Orte für diesen Filter.{' '}
          <button type="button" onClick={onClearFilters} className="text-terracotta underline">
            Filter zurücksetzen
          </button>
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
