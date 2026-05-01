/**
 * #255: Lazy-loading Hook fuer Frankfurter-API-Wechselkurse.
 * Faengt nur an zu fetchen wenn `enabled === true` (typischerweise:
 * TripConfig.currency != Settings.homeCurrency).
 */

import { useEffect, useState } from 'react';
import { fetchRates, type ExchangeRatesData } from '../lib/exchangeRates';

interface UseExchangeRatesResult {
  data: ExchangeRatesData | null;
  loading: boolean;
  error: string | null;
}

export function useExchangeRates(base: string, enabled: boolean): UseExchangeRatesResult {
  const [data, setData] = useState<ExchangeRatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRates(base)
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Wechselkurs-Fehler');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [base, enabled]);

  return { data, loading, error };
}
