import { useState } from 'react';
import {
  Camera,
  Check,
  ExternalLink,
  Heart,
  Home,
  MapPin,
  MapPinOff,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { POI } from '../../data/pois';
import { CATEGORY_EMOJI } from '../../data/pois';
import type { Family, Homebase } from '../../settings/types';
import { formatDayLabel } from '../../lib/dates';
import { haversineKm, formatDistance } from '../../lib/geo';

interface Props {
  poi: POI;
  family?: Family;
  selected: boolean;
  /** Tage (ISO-Strings), denen der POI im Plan zugeordnet ist. */
  assignedDays: string[];
  /** Alle Tage der Reise — für die Berechnung von „Tag 3/7". */
  allDays: string[];
  onLike: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onHighlight: (id: string) => void;
  onSetAsHomebase?: (id: string) => void;
  homebase?: Homebase;
  onLocate?: (id: string) => void;
}

const CATEGORY_GRADIENT: Record<POI['category'], string> = {
  Kultur: 'linear-gradient(135deg, #D4A24C 0%, #A85637 100%)',
  Pizza: 'linear-gradient(135deg, #E8C78A 0%, #C96F4A 100%)',
  Gelato: 'linear-gradient(135deg, #F1EADC 0%, #8A7CA8 100%)',
  Trattoria: 'linear-gradient(135deg, #C96F4A 0%, #7A2E2E 100%)',
  Aperitivo: 'linear-gradient(135deg, #D4A24C 0%, #7A2E2E 100%)',
  Instagram: 'linear-gradient(135deg, #C96F4A 0%, #8A7CA8 100%)',
  Sonstiges: 'linear-gradient(135deg, #6B7A3F 0%, #4F5B2D 100%)',
};

export function PoiCard({
  poi,
  family,
  selected,
  assignedDays,
  allDays,
  onLike,
  onToggleSelect,
  onRemove,
  onEdit,
  onHighlight,
  onSetAsHomebase,
  homebase,
  onLocate,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const familyName = family?.name ?? 'Unbekannt';
  const familyColor = family?.color ?? '#94999d';
  const distFromHome =
    homebase?.coords && poi.coords
      ? haversineKm(homebase.coords, poi.coords)
      : null;
  const hasImage = !!poi.image && !imgFailed;

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-md shadow-ink/5 transition hover:shadow-lg">
      <button
        type="button"
        onClick={() => onHighlight(poi.id)}
        className="relative flex h-40 w-full items-center justify-center overflow-hidden"
        style={
          hasImage
            ? undefined
            : { background: CATEGORY_GRADIENT[poi.category] }
        }
        aria-label={`${poi.title} auf Karte anzeigen`}
      >
        {hasImage ? (
          <img
            src={poi.image}
            alt={poi.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/90">
            <span className="text-5xl">{CATEGORY_EMOJI[poi.category]}</span>
            <span
              className="px-4 text-center text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {poi.title}
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-ocker px-3 py-1 text-xs font-semibold text-white shadow">
          {CATEGORY_EMOJI[poi.category]} {poi.category}
        </span>
        <span
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold backdrop-blur"
          style={{ color: familyColor }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: familyColor }}
          />
          {familyName}
        </span>
        {poi.needsLocation && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white shadow">
            <MapPinOff className="h-3 w-3" />
            Ort fehlt
          </span>
        )}
      </button>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-xl leading-tight text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {poi.title}
          </h3>
          <div className="flex flex-shrink-0 gap-1">
            {onSetAsHomebase && poi.coords && (
              <button
                type="button"
                onClick={() => onSetAsHomebase(poi.id)}
                className="rounded-full p-1.5 text-ink/30 hover:bg-ink/10 hover:text-ink"
                aria-label="Als Homebase setzen"
                title="Als Homebase setzen"
              >
                <Home className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(poi.id)}
              className="rounded-full p-1.5 text-ink/30 hover:bg-ocker/15 hover:text-ocker"
              aria-label="Bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`„${poi.title}" wirklich löschen?`)) onRemove(poi.id);
              }}
              className="rounded-full p-1.5 text-ink/30 hover:bg-terracotta/10 hover:text-terracotta"
              aria-label="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {assignedDays.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {assignedDays.map((day) => {
              const idx = allDays.indexOf(day);
              const label =
                idx >= 0 ? `Tag ${idx + 1} · ${formatDayLabel(day)}` : formatDayLabel(day);
              return (
                <span
                  key={day}
                  className="rounded-full bg-olive/15 px-2 py-0.5 text-[10px] font-semibold text-olive-dark"
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {(poi.address || poi.rating !== undefined || distFromHome !== null) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/60">
            {distFromHome !== null && (
              <span className="flex items-center gap-1 font-semibold text-ink/70">
                <Home className="h-3 w-3 flex-shrink-0" />
                {formatDistance(distFromHome)}
              </span>
            )}
            {poi.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{poi.address}</span>
              </span>
            )}
            {poi.rating !== undefined && (
              <span className="flex items-center gap-1 text-ocker">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">{poi.rating.toFixed(1)}</span>
                {poi.userRatingCount !== undefined && (
                  <span className="text-ink/40">({poi.userRatingCount})</span>
                )}
              </span>
            )}
          </div>
        )}

        {poi.description && (
          <p className="line-clamp-2 text-sm text-ink/60">{poi.description}</p>
        )}

        {(poi.instagramUrl || poi.mapsUrl) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {poi.instagramUrl && (
              <a
                href={poi.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink hover:bg-ink/10"
              >
                <Camera className="h-3 w-3" />
                Instagram
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
            {poi.mapsUrl && (
              <a
                href={poi.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink hover:bg-ink/10"
              >
                <MapPin className="h-3 w-3" />
                Google Maps
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => onLike(poi.id)}
            className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-semibold text-terracotta transition hover:bg-terracotta/10"
          >
            <Heart className="h-4 w-4 fill-current" />
            {poi.likes}
          </button>
          {poi.needsLocation && onLocate ? (
            <button
              type="button"
              onClick={() => onLocate(poi.id)}
              className="flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-sm font-semibold text-white hover:bg-terracotta-dark"
            >
              Verorten
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleSelect(poi.id)}
              disabled={poi.needsLocation}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
                selected
                  ? 'bg-olive text-white hover:bg-olive-dark'
                  : 'bg-cream text-olive hover:bg-olive/10'
              }`}
            >
              {selected ? (
                <>
                  <Check className="h-4 w-4" />
                  Im Plan
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Zum Tag
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
