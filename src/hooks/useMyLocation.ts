import { useEffect, useState } from 'react';

export interface MyLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
}

export function useMyLocation(enabled = true) {
  const [location, setLocation] = useState<MyLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setError(enabled ? 'Geolocation nicht unterstützt.' : null);
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
        if (err.code === err.PERMISSION_DENIED) {
          setError('Standort-Zugriff verweigert.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { location, error };
}
