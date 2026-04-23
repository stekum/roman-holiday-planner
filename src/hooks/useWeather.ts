import { useEffect, useState } from 'react';
import { fetchWeatherForecast, type DayWeather } from '../lib/weather';

/**
 * Fetches 16-day weather forecast from Open-Meteo.
 * Returns a map from ISO date → DayWeather for quick lookup.
 * Cached in-memory for 1 hour, pro (lat,lng,timezone)-Tripel.
 */
export function useWeather(
  homebaseCoords?: { lat: number; lng: number },
  timezone?: string,
) {
  const [weatherByDay, setWeatherByDay] = useState<Record<string, DayWeather>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    fetchWeatherForecast(homebaseCoords?.lat, homebaseCoords?.lng, timezone)
      .then((days) => {
        if (cancelled) return;
        const map: Record<string, DayWeather> = {};
        for (const d of days) map[d.date] = d;
        setWeatherByDay(map);
      })
      .catch((err) => {
        console.warn('[Weather] fetch failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [homebaseCoords?.lat, homebaseCoords?.lng, timezone]);

  return weatherByDay;
}
