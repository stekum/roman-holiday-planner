import { useState } from 'react';
import { AlertTriangle, Phone, Building2, Shield, Hospital } from 'lucide-react';
import type { Settings } from '../../settings/types';
import { getTripConfig } from '../../settings/tripConfig';
import { getEmergencyForCountry } from '../../lib/emergencyContacts';

interface Props {
  settings: Settings;
  onSetInsurance: (data: { name?: string; phone?: string; policyNumber?: string }) => void;
}

/**
 * #44: Notfall-Dashboard pro Trip. Zeigt:
 * - Lokaler Notruf (statisch je Country)
 * - Botschaft (statisch je Country)
 * - Versicherung (User-eintragbar, persistiert in Settings)
 * - Krankenhaus-Suche (Link zu Google Maps mit "hospital near me")
 *
 * Alles offline-fähig (statische Daten + tel:-Links + Google-Maps-URL).
 */
export function EmergencySection({ settings, onSetInsurance }: Props) {
  const country = getTripConfig(settings).country;
  const data = getEmergencyForCountry(country);

  const [name, setName] = useState(settings.insurance?.name ?? '');
  const [phone, setPhone] = useState(settings.insurance?.phone ?? '');
  const [policyNumber, setPolicyNumber] = useState(settings.insurance?.policyNumber ?? '');

  const commitInsurance = () => {
    onSetInsurance({
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      policyNumber: policyNumber.trim() || undefined,
    });
  };

  // Hospital-Search via Google Maps (offline-tolerant: oeffnet die App / Browser)
  const hospitalSearchUrl =
    'https://www.google.com/maps/search/hospital+near+me/?api=1';

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-ink/5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-terracotta" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">
          Notfall
        </h3>
        {data && (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink/40">
            {data.label}
          </span>
        )}
      </div>

      {!data ? (
        <p className="text-xs text-ink/60">
          Für „{country}" sind keine Notfall-Daten hinterlegt. Im Notfall: 112
          (EU) oder lokaler Notruf des Landes.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Lokaler Notruf */}
          <div className="rounded-xl bg-terracotta/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-terracotta">
              <Phone className="h-3 w-3" />
              Lokaler Notruf
            </div>
            <div className="flex flex-wrap gap-2">
              {data.general && (
                <a
                  href={`tel:${data.general.number}`}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white px-3 py-2 text-center shadow-sm transition hover:bg-cream"
                >
                  <span className="text-lg font-bold text-terracotta">{data.general.number}</span>
                  <span className="text-[10px] text-ink/60">{data.general.label}</span>
                </a>
              )}
              {data.police && (
                <a
                  href={`tel:${data.police.number}`}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white px-3 py-2 text-center shadow-sm transition hover:bg-cream"
                >
                  <span className="text-lg font-bold text-terracotta">{data.police.number}</span>
                  <span className="text-[10px] text-ink/60">{data.police.label ?? 'Polizei'}</span>
                </a>
              )}
              {data.ambulance && (
                <a
                  href={`tel:${data.ambulance.number}`}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white px-3 py-2 text-center shadow-sm transition hover:bg-cream"
                >
                  <span className="text-lg font-bold text-terracotta">{data.ambulance.number}</span>
                  <span className="text-[10px] text-ink/60">{data.ambulance.label ?? 'Krankenwagen'}</span>
                </a>
              )}
            </div>
          </div>

          {/* Botschaft */}
          {data.embassy && (
            <div className="rounded-xl bg-ink/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/60">
                <Building2 className="h-3 w-3" />
                Botschaft
              </div>
              <p className="text-sm font-medium text-ink">{data.embassy.name}</p>
              {data.embassy.address && (
                <p className="mt-0.5 text-xs text-ink/60">{data.embassy.address}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={`tel:${data.embassy.phone}`}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
                >
                  <Phone className="h-3 w-3" />
                  {data.embassy.phone}
                </a>
                {data.embassy.emergencyContact && (
                  <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs text-terracotta">
                    {data.embassy.emergencyContact}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Krankenhaus-Suche */}
      <div className="mt-3">
        <a
          href={hospitalSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl bg-olive/10 px-3 py-2.5 text-sm font-semibold text-olive-dark transition hover:bg-olive/20"
        >
          <Hospital className="h-4 w-4" />
          Nächstes Krankenhaus in Google Maps suchen
        </a>
      </div>

      {/* Versicherung */}
      <div className="mt-3 rounded-xl bg-ocker/5 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ocker">
          <Shield className="h-3 w-3" />
          Reise-Versicherung
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitInsurance}
            placeholder="z.B. ADAC Auslands-Krankenschutz"
            className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:bg-white"
          />
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={commitInsurance}
              placeholder="Hotline (mit +49…)"
              className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:bg-white"
            />
            <input
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              onBlur={commitInsurance}
              placeholder="Policen-Nr."
              className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:bg-white"
            />
          </div>
          {settings.insurance?.phone && (
            <a
              href={`tel:${settings.insurance.phone}`}
              className="mt-1 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
            >
              <Phone className="h-3 w-3" />
              Versicherung anrufen
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
