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
 * Trip-Kontext fuer AI-Prompts + Kategorie-System + Map-Defaults. Macht die
 * App trip-agnostisch — vorher war "Rom, Italien" hardcoded in aiDayPlanner
 * und co. Ab v1.5 konfigurierbar pro Workspace; seit v3.0 (#73) kommen
 * Geo-Felder dazu, damit die Map nicht mehr auf ROME_CENTER fallbacked.
 *
 * Geo-Felder sind alle optional — alte Workspaces (vor #73 geschrieben)
 * haben sie nicht, der Resolver in `tripConfig.ts` faellt dann auf Rom-
 * Defaults zurueck.
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
  /** Default-Map-Mittelpunkt wenn keine Homebase gesetzt ist (#73). */
  center?: { lat: number; lng: number };
  /** Default-Map-Zoom beim ersten Oeffnen (#73). */
  defaultZoom?: number;
  /** IANA-Timezone (z.B. "Europe/Rome", "Asia/Tokyo") — heuristisch aus
   *  Land abgeleitet wenn via CityPicker befuellt (#73). */
  timezone?: string;
  /** ISO-4217 Currency-Code (z.B. "EUR", "JPY"). Ersetzt die rein
   *  textbasierte Ableitung aus Country (#73). */
  currency?: string;
}

export interface Settings {
  tripStart: string; // ISO YYYY-MM-DD
  tripEnd: string;   // ISO YYYY-MM-DD
  families: Family[];
  homebase?: Homebase;
  /** Wenn nicht gesetzt → DEFAULT_TRIP_CONFIG (Rom/Italien/Deutsch). */
  tripConfig?: TripConfig;
}
