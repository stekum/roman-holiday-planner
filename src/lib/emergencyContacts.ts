/**
 * #44: Notfall-Kontakte pro Reise-Land. Bewusst hardcoded (statisch),
 * damit die Daten auch offline + ohne API verfuegbar sind. Quellen:
 * Auswaertiges Amt + lokale Polizei-/Botschafts-Webseiten (Stand 2026).
 */

export interface LocalEmergency {
  /** ISO-3166-1 alpha-2 oder Land-Name (matched via getEmergencyForCountry). */
  country: string;
  /** Kurzer Anzeigename z.B. "Japan". */
  label: string;
  /** Lokaler Notruf — Polizei. */
  police?: { number: string; label?: string };
  /** Lokaler Notruf — Krankenwagen / Feuerwehr. */
  ambulance?: { number: string; label?: string };
  /** Allgemeiner Notruf wenn nicht differenziert (z.B. EU 112). */
  general?: { number: string; label?: string };
  /** Deutsche Botschaft / Konsulat im Land. */
  embassy?: {
    name: string;
    phone: string;
    address?: string;
    /** Optional: Mail oder URL fuer Notfaelle ausserhalb der Sprechzeiten. */
    emergencyContact?: string;
  };
}

export const EMERGENCY_DATA: LocalEmergency[] = [
  {
    country: 'japan',
    label: 'Japan',
    police: { number: '110', label: 'Polizei' },
    ambulance: { number: '119', label: 'Krankenwagen / Feuerwehr' },
    embassy: {
      name: 'Deutsche Botschaft Tokyo',
      phone: '+81-3-5791-7700',
      address: '4-5-10 Minami-Azabu, Minato-ku, Tokyo 106-0047',
      emergencyContact: '+81-3-5791-7777 (24h-Notruf)',
    },
  },
  {
    country: 'italien',
    label: 'Italien',
    general: { number: '112', label: 'Allgemeiner EU-Notruf' },
    police: { number: '113', label: 'Polizei (Polizia)' },
    ambulance: { number: '118', label: 'Krankenwagen' },
    embassy: {
      name: 'Deutsche Botschaft Rom',
      phone: '+39-06-49213-1',
      address: 'Via San Martino della Battaglia 4, 00185 Rom',
      emergencyContact: '+39-335-571-3000 (24h-Notruf)',
    },
  },
  {
    country: 'deutschland',
    label: 'Deutschland',
    general: { number: '112', label: 'Allgemeiner Notruf (Feuerwehr/Krankenwagen)' },
    police: { number: '110', label: 'Polizei' },
  },
  {
    country: 'frankreich',
    label: 'Frankreich',
    general: { number: '112', label: 'Allgemeiner EU-Notruf' },
    police: { number: '17', label: 'Polizei' },
    ambulance: { number: '15', label: 'SAMU (Krankenwagen)' },
    embassy: {
      name: 'Deutsche Botschaft Paris',
      phone: '+33-1-53-83-45-00',
      address: '13/15 Avenue Franklin D. Roosevelt, 75008 Paris',
    },
  },
  {
    country: 'spanien',
    label: 'Spanien',
    general: { number: '112', label: 'Allgemeiner EU-Notruf' },
    police: { number: '091', label: 'Polizei (Policía Nacional)' },
    embassy: {
      name: 'Deutsche Botschaft Madrid',
      phone: '+34-91-557-9000',
      address: 'C/ Fortuny 8, 28010 Madrid',
    },
  },
  {
    country: 'usa',
    label: 'USA',
    general: { number: '911', label: 'Allgemeiner Notruf' },
    embassy: {
      name: 'Deutsche Botschaft Washington',
      phone: '+1-202-298-4000',
      address: '4645 Reservoir Road NW, Washington, DC 20007',
    },
  },
  {
    country: 'uk',
    label: 'Vereinigtes Königreich',
    general: { number: '999', label: 'Allgemeiner Notruf' },
    embassy: {
      name: 'Deutsche Botschaft London',
      phone: '+44-20-7824-1300',
      address: '23 Belgrave Square, London SW1X 8PZ',
    },
  },
  {
    country: 'thailand',
    label: 'Thailand',
    police: { number: '191', label: 'Polizei' },
    ambulance: { number: '1669', label: 'Krankenwagen' },
    embassy: {
      name: 'Deutsche Botschaft Bangkok',
      phone: '+66-2-287-9000',
      address: '9 South Sathorn Road, Bangkok 10120',
    },
  },
];

/**
 * Findet Notfall-Daten zu einem Country-Namen (case-insensitive, robust
 * gegen leichte Schreibvarianten).
 */
export function getEmergencyForCountry(country: string | undefined): LocalEmergency | undefined {
  if (!country) return undefined;
  const c = country.toLowerCase().trim();
  return EMERGENCY_DATA.find((e) => {
    const ec = e.country.toLowerCase();
    return (
      c === ec ||
      c.startsWith(ec) ||
      ec.startsWith(c) ||
      // Aliase fuer englische/originale Namen
      (ec === 'japan' && ['japon', 'japanisch'].includes(c)) ||
      (ec === 'italien' && ['italia', 'italy'].includes(c)) ||
      (ec === 'deutschland' && ['germany'].includes(c)) ||
      (ec === 'frankreich' && ['france'].includes(c)) ||
      (ec === 'spanien' && ['spain', 'españa'].includes(c)) ||
      (ec === 'usa' && ['us', 'vereinigte staaten', 'united states'].includes(c)) ||
      (ec === 'uk' && ['england', 'vereinigtes königreich', 'united kingdom'].includes(c))
    );
  });
}
