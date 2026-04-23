/**
 * Open-Meteo Weather Forecast.
 * Free, no API key, no CORS issues.
 * https://open-meteo.com/en/docs
 *
 * Seit Multi-Trip: Koordinaten + Timezone werden vom Caller uebergeben,
 * default bleibt Rom als Fallback fuer alte Workspaces ohne TripConfig-
 * Geo-Felder. Cache ist nach lat/lng/timezone gekeyed — sonst wuerde der
 * erste Rom-Call die Tokyo-Antwort blockieren.
 */

export interface DayWeather {
  date: string; // ISO YYYY-MM-DD
  tempMax: number; // °C
  tempMin: number; // °C
  code: number; // WMO weather code
  icon: string; // emoji
  label: string; // short German label
}

// WMO Weather interpretation codes → emoji + label
// https://open-meteo.com/en/docs#weathervariables
const WMO: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Klar' },
  1: { icon: '🌤️', label: 'Überwiegend klar' },
  2: { icon: '⛅', label: 'Teilweise bewölkt' },
  3: { icon: '☁️', label: 'Bewölkt' },
  45: { icon: '🌫️', label: 'Nebel' },
  48: { icon: '🌫️', label: 'Reifnebel' },
  51: { icon: '🌦️', label: 'Leichter Nieselregen' },
  53: { icon: '🌦️', label: 'Nieselregen' },
  55: { icon: '🌧️', label: 'Starker Nieselregen' },
  56: { icon: '🌧️', label: 'Gefrierender Nieselregen' },
  57: { icon: '🌧️', label: 'Starker gefr. Nieselregen' },
  61: { icon: '🌦️', label: 'Leichter Regen' },
  63: { icon: '🌧️', label: 'Regen' },
  65: { icon: '🌧️', label: 'Starker Regen' },
  66: { icon: '🌧️', label: 'Gefrierender Regen' },
  67: { icon: '🌧️', label: 'Starker gefr. Regen' },
  71: { icon: '🌨️', label: 'Leichter Schnee' },
  73: { icon: '🌨️', label: 'Schnee' },
  75: { icon: '❄️', label: 'Starker Schnee' },
  77: { icon: '❄️', label: 'Schneekörner' },
  80: { icon: '🌦️', label: 'Leichte Regenschauer' },
  81: { icon: '🌧️', label: 'Regenschauer' },
  82: { icon: '⛈️', label: 'Starke Regenschauer' },
  85: { icon: '🌨️', label: 'Leichte Schneeschauer' },
  86: { icon: '❄️', label: 'Starke Schneeschauer' },
  95: { icon: '⛈️', label: 'Gewitter' },
  96: { icon: '⛈️', label: 'Gewitter mit Hagel' },
  99: { icon: '⛈️', label: 'Gewitter mit starkem Hagel' },
};

function decodeWmo(code: number): { icon: string; label: string } {
  return WMO[code] ?? { icon: '❓', label: `Code ${code}` };
}

// Simple in-memory cache with 1-hour TTL. Gekeyed nach lat/lng/timezone,
// damit ein Rom-Call keinen Tokyo-Call blockiert (Multi-Trip).
const cache = new Map<string, { data: DayWeather[]; fetchedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchWeatherForecast(
  lat = 41.8925,
  lng = 12.4853,
  timezone = 'Europe/Rome',
): Promise<DayWeather[]> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${timezone}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode');
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', '16');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);

  const json = await res.json();
  const { time, temperature_2m_max, temperature_2m_min, weathercode } =
    json.daily as {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weathercode: number[];
    };

  const days: DayWeather[] = time.map((date, i) => {
    const wmo = decodeWmo(weathercode[i]);
    return {
      date,
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      code: weathercode[i],
      icon: wmo.icon,
      label: wmo.label,
    };
  });

  cache.set(cacheKey, { data: days, fetchedAt: Date.now() });
  return days;
}
