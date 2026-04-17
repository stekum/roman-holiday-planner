/**
 * Kategorie — seit #75 als `string` definiert, damit pro Trip
 * konfigurierbar (z.B. "Ramen", "Tempel" fuer Tokyo). Die bekannten
 * Rom-Defaults liefert `CATEGORIES`; Emoji-Lookup mit Fallback via
 * `src/settings/tripConfig.ts → getCategoryEmoji`.
 */
export type Category = string;

export interface POI {
  id: string;
  title: string;
  category: Category;
  familyId: string;
  description: string;
  /** Optional — fehlt bei Inbox-Items die noch verortet werden müssen. */
  coords?: { lat: number; lng: number };
  /** Optional — leerer String zeigt Gradient-Placeholder mit Kategorie-Emoji. */
  image: string;
  likes: number;
  instagramUrl?: string;
  placeId?: string;
  /** Von Google Places übernommen (Search/Map-Klick). */
  address?: string;
  rating?: number;
  userRatingCount?: number;
  mapsUrl?: string;
  /** Öffnungszeiten von Google Places, z.B. ["Mo: 09:00–18:00", ...]. */
  openingHours?: string[];
  /** true wenn der POI noch manuell verortet werden muss (Inbox). */
  needsLocation?: boolean;
  /** KI-generierte Review-Zusammenfassung (Places API generativeSummary). */
  aiSummary?: string;
  /** Per-Familie-Vote. Key = familyId, Value = Richtung. */
  votes?: Record<string, Vote>;
  createdAt: number;
}

export type Vote = 'up' | 'down' | 'neutral';

export interface VoteCounts {
  up: number;
  down: number;
  neutral: number;
  score: number; // up - down, für Sortierung
}

export function countVotes(votes: POI['votes']): VoteCounts {
  const counts: VoteCounts = { up: 0, down: 0, neutral: 0, score: 0 };
  if (!votes) return counts;
  for (const v of Object.values(votes)) {
    if (v === 'up') counts.up += 1;
    else if (v === 'down') counts.down += 1;
    else if (v === 'neutral') counts.neutral += 1;
  }
  counts.score = counts.up - counts.down;
  return counts;
}

/**
 * Rom-Default-Kategorien. Seit #75 pro Trip ueberschreibbar:
 * `settings.tripConfig.categories`. Der Rom-Default wird verwendet
 * wenn kein TripConfig gesetzt ist oder als Fallback.
 *
 * Fuer live-Zugriff bitte `getTripConfig(settings).categories` aus
 * `src/settings/tripConfig.ts` verwenden, nicht diesen Export.
 */
export const CATEGORIES: Category[] = [
  'Kultur',
  'Pizza',
  'Gelato',
  'Trattoria',
  'Aperitivo',
  'Instagram',
  'Sonstiges',
];

export const ROME_CENTER = { lat: 41.8925, lng: 12.4853 };

/**
 * Emoji-Lookup fuer Rom-Default-Kategorien. Fuer custom-Kategorien
 * (z.B. Ramen in einem Tokyo-Trip) bitte `getCategoryEmoji` aus
 * `src/settings/tripConfig.ts` verwenden — das hat Fallback auf 📍.
 */
export const CATEGORY_EMOJI: Record<string, string> = {
  Kultur: '🏛️',
  Pizza: '🍕',
  Gelato: '🍨',
  Trattoria: '🍝',
  Aperitivo: '🍹',
  Instagram: '📸',
  Sonstiges: '📍',
};

const now = Date.now();

export const SEED_POIS: POI[] = [
  {
    id: 'colosseo',
    title: 'Colosseo',
    category: 'Kultur',
    familyId: 'default-a',
    description:
      'Das berühmteste Wahrzeichen Roms. Früh morgens hingehen, bevor die Schlangen kommen.',
    coords: { lat: 41.8902, lng: 12.4922 },
    image: '',
    likes: 3,
    createdAt: now - 5000,
  },
  {
    id: 'pantheon',
    title: 'Pantheon',
    category: 'Kultur',
    familyId: 'default-b',
    description:
      'Perfekt erhaltenes antikes Bauwerk mit beeindruckender Kuppel. Eintritt inzwischen kostenpflichtig.',
    coords: { lat: 41.8986, lng: 12.4769 },
    image: '',
    likes: 2,
    createdAt: now - 4000,
  },
  {
    id: 'da-enzo',
    title: 'Da Enzo al 29',
    category: 'Trattoria',
    familyId: 'default-a',
    description:
      'Winzige Trattoria in Trastevere. Cacio e Pepe und Carbonara wie aus dem Bilderbuch. Reservieren!',
    coords: { lat: 41.8896, lng: 12.4728 },
    image: '',
    likes: 5,
    createdAt: now - 3000,
  },
  {
    id: 'gelateria-del-teatro',
    title: 'Gelateria del Teatro',
    category: 'Gelato',
    familyId: 'default-b',
    description:
      'Handwerkliches Gelato mit außergewöhnlichen Sorten wie Lavendel-Pfirsich oder Rosmarin-Honig.',
    coords: { lat: 41.8996, lng: 12.4712 },
    image: '',
    likes: 4,
    createdAt: now - 2000,
  },
  {
    id: 'pizzarium',
    title: 'Pizzarium Bonci',
    category: 'Pizza',
    familyId: 'default-a',
    description:
      'Römische Pizza al taglio vom Meister Gabriele Bonci. Unbedingt mehrere Sorten probieren.',
    coords: { lat: 41.9074, lng: 12.4458 },
    image: '',
    likes: 6,
    createdAt: now - 1000,
  },
];
