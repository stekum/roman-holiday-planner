import { useEffect, useState } from 'react';

export interface MyLocation {
  lat: number;
  lng: number;
  accuracy: number; // meters
  heading: number | null; // degrees, null if not moving
}

/**
 * Watches the user's GPS position via `navigator.geolocation.watchPosition`.
 * Browser-native, no API key needed. Returns null until first fix.
 * Automatically cleans up on unmount.
 */
export function useMyLocation(enabled = true) {
  const [location, setLocation] = useState<MyLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setError(enabled ? 'Geolocation wird von diesem Browser nicht unterstützt.' : null);
      return;
    }

    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
        });
        setError(null);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Standort-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Standort nicht verfügbar.');
            break;
          case err.TIMEOUT:
            setError('Standort-Abfrage dauert zu lange.');
            break;
          default:
            setError('Standort konnte nicht ermittelt werden.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000, // accept cached position up to 10s old
        timeout: 15_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { location, error };
}
