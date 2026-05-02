export interface Family {
  id: string;
  name: string;
  color: string; // hex
}

/**
 * #50: Activity-Feed-Event. Wird in Firestore unter workspaces/{id}/activity
 * persistiert und in der UI als Live-Feed angezeigt.
 */
export interface ActivityEvent {
  id: string;
  /** Wer hat's getan? Firebase Auth uid. */
  userId: string;
  /** Display-Name oder Email — für UI-Anzeige ohne extra Lookup. */
  userLabel?: string;
  /** Was ist passiert? */
  type: 'poi_added' | 'poi_removed' | 'poi_voted' | 'poi_planned' | 'poi_unplanned' | 'day_cleared';
  /** Optional: betroffene POI-ID (für Click-Through). */
  poiId?: string;
  /** Optional: Titel des betroffenen POI (für Anzeige ohne Lookup). */
  poiTitle?: string;
  /** Optional: betroffener Tag (ISO YYYY-MM-DD) z.B. bei poi_planned. */
  dayIso?: string;
  /** Optional: extra Details (z.B. Vote-Wert). */
  detail?: string;
  /** Server-Timestamp der Erstellung (ms since epoch). */
  createdAt: number;
}

export interface Homebase {
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  placeId?: string;
  image?: string;
  /**
   * Gültigkeits-Zeitraum dieser Homebase innerhalb der Reise (#74).
   * `from`/`to` sind inklusive ISO-Dates (YYYY-MM-DD). Fehlt das Feld,
   * gilt die Homebase für den gesamten Trip (catch-all). Bei sich
   * überlappenden Ranges gewinnt der erste Eintrag in der Liste.
   */
  dateRange?: { from: string; to: string };
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
  /**
   * Legacy single-Homebase-Feld (vor #74). Neue Schreibzugriffe sollten
   * `homebases` nutzen; der Resolver `getHomebases()` liest auch dieses
   * Feld als Single-Entry-Fallback, damit existierende Workspaces ohne
   * Migration weiterlaufen.
   */
  homebase?: Homebase;
  /**
   * Multi-Homebase-Liste pro Trip (#74). Jede Homebase kann einen
   * datumsbasierten Gültigkeits-Range haben — die App wählt automatisch
   * die für den aktiven Tag passende. Siehe `getHomebaseForDay()`.
   */
  homebases?: Homebase[];
  /**
   * Transit-Tage pro Trip (#78). Reisetage zwischen Städten ohne
   * POI-Programm. Wenn ein TripPlan-Tag in dieser Liste auftaucht,
   * rendert der DayPlanner statt POI-Routing eine Transit-Card.
   */
  transitDays?: TransitDay[];
  /** Wenn nicht gesetzt → DEFAULT_TRIP_CONFIG (Rom/Italien/Deutsch). */
  tripConfig?: TripConfig;
  /**
   * Heimat-Währung des Workspace (ISO-4217, z.B. "EUR"). Wird für die
   * Conversion-Anzeige genutzt — wenn TripConfig.currency abweicht (z.B.
   * Japan = JPY), zeigt die App zusätzliche EUR-Werte an. (#255)
   * Default: 'EUR'.
   */
  homeCurrency?: string;
  /**
   * Heimat-Zeitzone (IANA, z.B. "Europe/Berlin") fuer die Dual-Time-Anzeige
   * im Header (#33). Wenn nicht gesetzt: Browser-Default
   * (Intl.DateTimeFormat().resolvedOptions().timeZone).
   */
  homeTimezone?: string;
  /**
   * Reise-Versicherung-Kontakt fuers Notfall-Dashboard (#44).
   * Optional — wenn leer wird in der UI ein "noch hinzufügen"-Hinweis angezeigt.
   */
  insurance?: {
    /** Name der Versicherung, z.B. "ADAC Auslands-Krankenschutz". */
    name?: string;
    /** Hotline mit Ländervorwahl, z.B. "+49-89-7676-2222". */
    phone?: string;
    /** Versicherungsnummer / Police-Nr. */
    policyNumber?: string;
  };
  /**
   * UI-Sprache (#122 Phase 1). Steuert ausschließlich UI-Strings via
   * react-i18next. Ist NICHT identisch mit `tripConfig.language`, das die
   * Antwort-Sprache der AI-Helper definiert. Default: 'de'.
   */
  uiLanguage?: 'de' | 'en';
}

export interface TransitDay {
  /** ISO YYYY-MM-DD — der Tag der Reise. */
  date: string;
  /** Frei-Text Stadt-Namen, oder per Convention die Homebase-Namen
   *  zur Konsistenz mit homebases[].name. */
  fromCity: string;
  toCity: string;
  /** Verkehrsmittel als freier Text — "Shinkansen", "Flug", "Auto",
   *  "Bus", "Zug" — keine Enum, weil zu eng. */
  mode: string;
  /** Optional: Abfahrt im "HH:MM"-Format. */
  departure?: string;
  /** Optional: Ankunft im "HH:MM"-Format. */
  arrival?: string;
  /** Optional: Reservation/Sitz/Gleis/Buchungsnr. — frei. */
  info?: string;
}
