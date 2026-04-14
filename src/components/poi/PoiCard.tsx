import { useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  ExternalLink,
  Heart,
  Home,
  MapPin,
  MapPinOff,
  Meh,
  Navigation,
  Pencil,
  Plus,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import type { POI, Vote } from '../../data/pois';
import { CATEGORY_EMOJI, countVotes } from '../../data/pois';
import type { Family, Homebase } from '../../settings/types';
import { formatDayLabel } from '../../lib/dates';
import { haversineKm, formatDistance } from '../../lib/geo';
import { getOpenStatus } from '../../lib/openingHours';

export interface PoiCardProps {
  poi: POI;
  family?: Family;
  families: Family[];
  selected: boolean;
  assignedDays: string[];
  allDays: string[];
  compact?: boolean;
  /** Current device's "I belong to" family — drives the vote buttons. */
  myFamilyId: string;
  onLike: (id: string) => void;
  onVote: (id: string, vote: Vote) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onHighlight: (id: string) => void;
  onSetAsHomebase?: (id: string) => void;
  homebase?: Homebase;
  onLocate?: (id: string) => void;
  /** Opens Street View panorama in the shared map container for this POI. */
  onStreetView?: (id: string) => void;
}

function VoteRow({
  poi,
  families,
  myFamilyId,
  onVote,
  size = 'full',
}: {
  poi: POI;
  families: Family[];
  myFamilyId: string;
  onVote: (id: string, vote: Vote) => void;
  size?: 'full' | 'compact';
}) {
  const counts = countVotes(poi.votes);
  const myVote = poi.votes?.[myFamilyId] ?? 'neutral';
  const compact = size === 'compact';
  const btn = (vote: Vote, Icon: typeof ThumbsUp, activeColor: string) => {
    const active = myVote === vote;
    return (
      <button
        key={vote}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          // Toggle: re-clicking the active vote resets to neutral.
          onVote(poi.id, active ? 'neutral' : vote);
        }}
        disabled={!myFamilyId}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-30 ${
          active ? activeColor : 'bg-ink/5 text-ink/50 hover:bg-ink/10'
        }`}
        aria-label={vote}
      >
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
    );
  };

  // Render a small colored dot per family that has voted (up/down),
  // grouped by direction — gives a quick "who feels how" read-out.
  const votedFamilies = (direction: 'up' | 'down') =>
    families.filter((f) => poi.votes?.[f.id] === direction);
  const upFamilies = votedFamilies('up');
  const downFamilies = votedFamilies('down');

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1">
        {btn('up', ThumbsUp, 'bg-olive text-white')}
        {btn('neutral', Meh, 'bg-ocker text-white')}
        {btn('down', ThumbsDown, 'bg-terracotta text-white')}
      </div>
      {(counts.up > 0 || counts.down > 0) && (
        <div className="flex items-center gap-1 text-[11px] text-ink/50">
          {counts.up > 0 && (
            <span className="flex items-center gap-0.5 text-olive">
              {counts.up}×
              {upFamilies.map((f) => (
                <span
                  key={f.id}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: f.color }}
                  title={f.name}
                />
              ))}
            </span>
          )}
          {counts.down > 0 && (
            <span className="flex items-center gap-0.5 text-terracotta">
              {counts.down}×
              {downFamilies.map((f) => (
                <span
                  key={f.id}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: f.color }}
                  title={f.name}
                />
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
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

export function PoiCard(props: PoiCardProps) {
  return props.compact ? <CompactCard {...props} /> : <FullCard {...props} />;
}

/* ─── Compact Card (horizontal, ~72px) ─── */

function CompactCard({
  poi,
  family,
  families,
  myFamilyId,
  selected,
  onLike,
  onVote,
  onToggleSelect,
  onHighlight,
  homebase,
}: PoiCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const familyColor = family?.color ?? '#94999d';
  const hasImage = !!poi.image?.trim() && !imgFailed;
  const distFromHome =
    homebase?.coords && poi.coords
      ? haversineKm(homebase.coords, poi.coords)
      : null;

  return (
    <article className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm shadow-ink/5 transition hover:shadow-md">
      <button
        type="button"
        onClick={() => onHighlight(poi.id)}
        className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl"
        style={{ background: CATEGORY_GRADIENT[poi.category] }}
        aria-label={`${poi.title} auf Karte anzeigen`}
      >
        {hasImage ? (
          <img
            src={poi.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">
            {CATEGORY_EMOJI[poi.category]}
          </span>
        )}
        {poi.needsLocation && (
          <span className="absolute inset-0 flex items-center justify-center bg-terracotta/60 text-white">
            <MapPinOff className="h-4 w-4" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: familyColor }}
          />
          <span
            className="truncate text-sm font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {poi.title}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink/50">
          <span>{CATEGORY_EMOJI[poi.category]} {poi.category}</span>
          {distFromHome !== null && (
            <span className="flex items-center gap-0.5 font-semibold text-ink/70">
              <Home className="h-2.5 w-2.5" />
              {formatDistance(distFromHome)}
            </span>
          )}
          {poi.rating !== undefined && (
            <span className="flex items-center gap-0.5 text-ocker">
              <Star className="h-2.5 w-2.5 fill-current" />
              {poi.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="mt-1">
          <VoteRow
            poi={poi}
            families={families}
            myFamilyId={myFamilyId}
            onVote={onVote}
            size="compact"
          />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onLike(poi.id)}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-terracotta hover:bg-terracotta/10"
        >
          <Heart className="h-3.5 w-3.5 fill-current" />
          {poi.likes}
        </button>
        <button
          type="button"
          onClick={() => onToggleSelect(poi.id)}
          disabled={poi.needsLocation}
          className={`rounded-full p-1.5 text-xs transition disabled:opacity-30 ${
            selected ? 'bg-olive text-white' : 'text-olive hover:bg-olive/10'
          }`}
          aria-label={selected ? 'Im Plan' : 'Zum Tag'}
        >
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

/* ─── Full Card (vertical, equal-height via flex) ─── */

function FullCard({
  poi,
  family,
  families,
  myFamilyId,
  selected,
  assignedDays,
  allDays,
  onLike,
  onVote,
  onToggleSelect,
  onRemove,
  onEdit,
  onHighlight,
  onSetAsHomebase,
  homebase,
  onLocate,
  onStreetView,
}: PoiCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const familyName = family?.name ?? 'Unbekannt';
  const familyColor = family?.color ?? '#94999d';
  const distFromHome =
    homebase?.coords && poi.coords
      ? haversineKm(homebase.coords, poi.coords)
      : null;
  const hasImage = !!poi.image && !imgFailed;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-md shadow-ink/5 transition hover:shadow-lg">
      <button
        type="button"
        onClick={() => onHighlight(poi.id)}
        className="relative flex h-40 w-full items-center justify-center overflow-hidden"
        style={{ background: CATEGORY_GRADIENT[poi.category] }}
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

      <div className="flex flex-1 flex-col space-y-2 p-4">
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
            {(() => {
              const status = getOpenStatus(poi.openingHours);
              if (!status.label) return null;
              return (
                <span
                  className={`flex items-center gap-1 font-semibold ${
                    status.isOpen === false ? 'text-terracotta' : 'text-olive'
                  }`}
                  title={poi.openingHours?.join('\n')}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                    status.isOpen === false ? 'bg-terracotta' : 'bg-olive'
                  }`} />
                  {status.label}
                </span>
              );
            })()}
          </div>
        )}

        <p className="flex-1 line-clamp-2 text-sm text-ink/60">
          {poi.description || '\u00A0'}
        </p>

        {poi.aiSummary && (
          <div className="rounded-xl bg-purple-50 px-3 py-2 text-xs text-ink/70">
            <span className="mr-1 font-semibold text-purple-600">Was Gäste sagen</span>
            <span className="line-clamp-3">{poi.aiSummary}</span>
          </div>
        )}

        {(poi.instagramUrl || poi.mapsUrl || poi.coords) && (
          <div className="flex flex-wrap gap-2">
            {poi.coords && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${poi.coords.lat},${poi.coords.lng}&travelmode=walking`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full bg-olive/10 px-3 py-1 text-xs font-semibold text-olive hover:bg-olive/20"
              >
                <Navigation className="h-3 w-3" />
                Navigieren
              </a>
            )}
            {poi.coords && onStreetView && (
              <button
                type="button"
                onClick={() => onStreetView(poi.id)}
                className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink hover:bg-ink/10"
              >
                <Eye className="h-3 w-3" />
                Street View
              </button>
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
          </div>
        )}

        <div className="mt-auto pt-1">
          <VoteRow
            poi={poi}
            families={families}
            myFamilyId={myFamilyId}
            onVote={onVote}
          />
        </div>

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
