import { useState } from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import type { DayBudget } from '../../firebase/useWorkspace';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { convertAmount, formatConverted } from '../../lib/exchangeRates';
import { currencySymbolFromCode } from '../../settings/tripConfig';

interface Props {
  dayIso: string;
  budget?: DayBudget;
  onChange: (dayIso: string, b: DayBudget) => void;
  /** Waehrungs-Symbol aus TripConfig-Land abgeleitet, default '€'. */
  currencySymbol?: string;
  /** ISO-4217 der Trip-Waehrung (#255), z.B. 'JPY'. Default 'EUR'. */
  tripCurrency?: string;
  /** ISO-4217 der Heimat-Waehrung (#255), z.B. 'EUR'. Default 'EUR'. */
  homeCurrency?: string;
}

// Parent gibt `key={activeDay}` — bei Tag-Wechsel wird die Komponente neu
// gemountet und initialisiert State aus Props. Das vermeidet den
// setState-in-useEffect-Anti-Pattern.
export function DayBudgetCard({
  dayIso,
  budget,
  onChange,
  currencySymbol = '€',
  tripCurrency = 'EUR',
  homeCurrency = 'EUR',
}: Props) {
  const [budgetStr, setBudgetStr] = useState<string>(
    budget?.budget ? String(budget.budget) : '',
  );
  const [spentStr, setSpentStr] = useState<string>(
    budget?.spent ? String(budget.spent) : '',
  );

  const budgetNum = parseFloat(budgetStr) || 0;
  const spentNum = parseFloat(spentStr) || 0;
  const remaining = budgetNum - spentNum;
  const pct = budgetNum > 0 ? Math.min(100, (spentNum / budgetNum) * 100) : 0;
  const isWarning = budgetNum > 0 && pct >= 80 && pct < 100;
  const isOver = budgetNum > 0 && spentNum > budgetNum;
  const hasData = budgetNum > 0 || spentNum > 0;

  // #255: Conversion-Anzeige aktivieren wenn Trip- und Heimat-Waehrung
  // verschieden sind. Lazy-Load via Hook — wenn EUR=EUR, kein API-Call.
  const conversionEnabled =
    tripCurrency.toUpperCase() !== homeCurrency.toUpperCase();
  const { data: rates } = useExchangeRates(tripCurrency, conversionEnabled);
  const homeSymbol = currencySymbolFromCode(homeCurrency);
  const convert = (amount: number): string | null => {
    if (!conversionEnabled || !rates || amount <= 0) return null;
    const value = convertAmount(amount, tripCurrency, homeCurrency, rates);
    return value === null ? null : formatConverted(value, homeCurrency, homeSymbol);
  };
  const budgetConverted = convert(budgetNum);
  const spentConverted = convert(spentNum);

  const commit = () => {
    onChange(dayIso, { budget: budgetNum, spent: spentNum });
  };

  const barColor = isOver
    ? 'bg-terracotta'
    : isWarning
      ? 'bg-ocker'
      : 'bg-olive';

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-ink/5">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-terracotta" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">
          Tagesbudget
        </h3>
        {isOver && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-semibold text-terracotta">
            <AlertTriangle className="h-3 w-3" />
            Überzogen
          </span>
        )}
        {isWarning && !isOver && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-ocker/15 px-2 py-0.5 text-xs font-semibold text-ocker">
            <AlertTriangle className="h-3 w-3" />
            {pct.toFixed(0)}%
          </span>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            Budget
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 focus-within:border-terracotta focus-within:bg-white">
            <span className="text-sm text-ink/50">{currencySymbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
              onBlur={commit}
              placeholder="200"
              className="w-full bg-transparent text-ink outline-none"
            />
          </div>
          {budgetConverted && (
            <span className="mt-1 block text-[10px] text-ink/50">{budgetConverted}</span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            Ausgegeben
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 focus-within:border-terracotta focus-within:bg-white">
            <span className="text-sm text-ink/50">{currencySymbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={spentStr}
              onChange={(e) => setSpentStr(e.target.value)}
              onBlur={commit}
              placeholder="0"
              className="w-full bg-transparent text-ink outline-none"
            />
          </div>
          {spentConverted && (
            <span className="mt-1 block text-[10px] text-ink/50">{spentConverted}</span>
          )}
        </label>
      </div>

      {hasData && (
        <>
          <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-cream">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="text-xs text-ink/60">
            {budgetNum > 0 ? (
              isOver ? (
                <>
                  <strong className="text-terracotta">
                    {currencySymbol}
                    {Math.abs(remaining).toFixed(0)} über Budget
                  </strong>{' '}
                  ({currencySymbol}
                  {spentNum.toFixed(0)} von {currencySymbol}
                  {budgetNum.toFixed(0)})
                </>
              ) : (
                <>
                  <strong>
                    {currencySymbol}
                    {remaining.toFixed(0)} übrig
                  </strong>{' '}
                  ({currencySymbol}
                  {spentNum.toFixed(0)} von {currencySymbol}
                  {budgetNum.toFixed(0)})
                </>
              )
            ) : (
              <>Setze ein Budget, um den Fortschritt zu sehen.</>
            )}
          </p>
        </>
      )}
    </section>
  );
}
