export interface Family {
  id: string;
  name: string;
  color: string; // hex
}

export interface Homebase {
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  placeId?: string;
  image?: string;
}

/**
 * Trip-Kontext fuer AI-Prompts + Kategorie-System. Macht die App
 * trip-agnostisch — vorher war "Rom, Italien" hardcoded in aiDayPlanner
 * und co. Ab v1.5 konfigurierbar pro Workspace; Fundament fuer v3.0
 * Multi-Trip.
 */
export interface TripConfig {
  /** Stadt — Gemini-Prompts + Places-Suffixe, z.B. "Rom" / "Tokyo". */
  city: string;
  /** Land — Kontext fuer Gemini, z.B. "Italien" / "Japan". */
  country: string;
  /** Antwort-Sprache, z.B. "Deutsch" / "English". */
  language: string;
  /** POI-Kategorien fuer diesen Trip. 7 Eintraege Rom-Default. */
  categories: string[];
}

export interface Settings {
  tripStart: string; // ISO YYYY-MM-DD
  tripEnd: string;   // ISO YYYY-MM-DD
  families: Family[];
  homebase?: Homebase;
  /** Wenn nicht gesetzt → DEFAULT_TRIP_CONFIG (Rom/Italien/Deutsch). */
  tripConfig?: TripConfig;
}
