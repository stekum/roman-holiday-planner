import { Globe } from 'lucide-react';
import { currencySymbolFromCode } from '../../settings/tripConfig';

interface Props {
  value: string;
  onChange: (code: string) => void;
}

const SUPPORTED = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

/**
 * #255: Auswahl der Heimat-Waehrung pro Workspace. Wird genutzt fuer die
 * Conversion-Anzeige im DayBudgetCard wenn TripConfig.currency abweicht.
 * Default 'EUR'. Bewusst kurze Liste — kann spaeter erweitert werden.
 */
export function HomeCurrencyEditor({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-ink/5">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-terracotta" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">
          Heimat-Währung
        </h3>
      </div>
      <p className="mb-3 text-xs text-ink/60">
        Wenn dein Trip in einer anderen Währung läuft (z.B. Japan = ¥), zeigt
        die App zusätzlich Beträge in dieser Heimat-Währung an.
      </p>
      <label className="block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta focus:bg-white"
        >
          {SUPPORTED.map((code) => (
            <option key={code} value={code}>
              {currencySymbolFromCode(code)} — {code}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
