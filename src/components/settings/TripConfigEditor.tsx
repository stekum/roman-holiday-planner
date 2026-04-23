import { useState } from 'react';
import { Globe, X } from 'lucide-react';
import type { TripConfig } from '../../settings/types';
import {
  DEFAULT_TRIP_CONFIG,
  currencyCodeFromCountry,
  currencySymbolFromCode,
  getCategoryEmoji,
} from '../../settings/tripConfig';
import { CityPicker, type CityPick } from './CityPicker';

interface Props {
  tripConfig?: TripConfig;
  onChange: (cfg: TripConfig) => void;
}

/** Trip-Kontext fuer AI-Prompts, Kategorien und Map-Defaults (#75 + #76 + #73). */
export function TripConfigEditor({ tripConfig, onChange }: Props) {
  const current: TripConfig = {
    city: tripConfig?.city ?? DEFAULT_TRIP_CONFIG.city,
    country: tripConfig?.country ?? DEFAULT_TRIP_CONFIG.country,
    language: tripConfig?.language ?? DEFAULT_TRIP_CONFIG.language,
    categories: tripConfig?.categories ?? DEFAULT_TRIP_CONFIG.categories,
    center: tripConfig?.center ?? DEFAULT_TRIP_CONFIG.center,
    defaultZoom: tripConfig?.defaultZoom ?? DEFAULT_TRIP_CONFIG.defaultZoom,
    timezone: tripConfig?.timezone ?? DEFAULT_TRIP_CONFIG.timezone,
    currency: tripConfig?.currency ?? DEFAULT_TRIP_CONFIG.currency,
  };
  const [pending, setPending] = useState('');

  const update = (patch: Partial<TripConfig>) => onChange({ ...current, ...patch });

  /**
   * Wendet das Ergebnis der Places-Suche auf die Config an. Ueberschreibt
   * city/country/center/timezone/currency; language + categories bleiben
   * unveraendert (die gehoeren nicht zur Stadt, sondern zum User).
   */
  const applyCityPick = (pick: CityPick) => {
    update({
      city: pick.city,
      country: pick.country,
      center: pick.center,
      timezone: pick.timezone,
      currency: pick.currency,
    });
  };

  const addCategory = () => {
    const v = pending.trim();
    if (!v) return;
    if (current.categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
      setPending('');
      return;
    }
    update({ categories: [...current.categories, v] });
    setPending('');
  };

  const removeCategory = (cat: string) => {
    update({ categories: current.categories.filter((c) => c !== cat) });
  };

  const resetDefaults = () => onChange(DEFAULT_TRIP_CONFIG);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-terracotta" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Trip-Konfiguration
        </h2>
      </div>
      <p className="mb-4 text-xs text-ink/60">
        Stadt, Land, Sprache und Kategorien fliessen in alle AI-Prompts
        (Tagesplan, Briefing, Vibes-Suche, Vorschläge). Default: Rom/Italien.
      </p>

      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink/60">
          Stadt aus Places befüllen
        </p>
        <p className="mb-2 text-[11px] text-ink/50">
          Wählt automatisch Koordinaten, Land, Zeitzone und Währung. Felder
          unten kannst du anschließend frei überschreiben.
        </p>
        <CityPicker onPick={applyCityPick} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Stadt
          </span>
          <input
            type="text"
            value={current.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Rom"
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Land
          </span>
          <input
            type="text"
            value={current.country}
            onChange={(e) => update({ country: e.target.value })}
            placeholder="Italien"
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Sprache (AI-Antworten)
          </span>
          <select
            value={current.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          >
            <option value="Deutsch">Deutsch</option>
            <option value="English">English</option>
            <option value="Italienisch">Italienisch</option>
            <option value="Französisch">Französisch</option>
            <option value="Spanisch">Spanisch</option>
            <option value="Japanisch">Japanisch</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
            Währung
          </span>
          <select
            value={current.currency ?? currencyCodeFromCountry(current.country)}
            onChange={(e) => update({ currency: e.target.value })}
            className="w-full rounded-2xl border border-cream-dark bg-cream px-3 py-2.5 text-ink outline-none focus:border-terracotta focus:bg-white"
          >
            <option value="EUR">EUR € — Euro</option>
            <option value="JPY">JPY ¥ — Japanische Yen</option>
            <option value="USD">USD $ — US-Dollar</option>
            <option value="GBP">GBP £ — Pfund</option>
            <option value="CHF">CHF — Schweizer Franken</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cream-dark bg-cream/50 px-3 py-2.5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            Map-Mittelpunkt
          </p>
          <p className="truncate text-xs text-ink">
            {current.center
              ? `${current.center.lat.toFixed(4)}, ${current.center.lng.toFixed(4)}`
              : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-cream-dark bg-cream/50 px-3 py-2.5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            Zeitzone
          </p>
          <p className="truncate text-xs text-ink">
            {current.timezone ?? 'nicht gesetzt'}
          </p>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-ink/40">
        Aktive Währung: {currencySymbolFromCode(current.currency)} ({current.currency ?? 'EUR'})
      </p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            Kategorien ({current.categories.length})
          </span>
          <button
            type="button"
            onClick={resetDefaults}
            className="text-xs text-ink/50 hover:text-terracotta"
          >
            Auf Rom-Default zurücksetzen
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {current.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-sm text-ink"
            >
              <span>{getCategoryEmoji(cat)}</span>
              <span>{cat}</span>
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="rounded-full p-0.5 text-ink/40 hover:bg-terracotta/20 hover:text-terracotta"
                aria-label={`${cat} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCategory();
              }
            }}
            placeholder="z.B. Ramen, Tempel, Sushi…"
            className="flex-1 rounded-2xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:bg-white"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!pending.trim()}
            className="rounded-2xl bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </section>
  );
}
