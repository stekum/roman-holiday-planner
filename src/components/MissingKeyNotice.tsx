import { KeyRound, ExternalLink } from 'lucide-react';

export function MissingKeyNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-md shadow-ink/10">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-full bg-ocker/20 p-3 text-ocker">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2
          className="text-2xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Google Maps API-Key fehlt
        </h2>
      </div>
      <p className="mb-4 text-sm text-ink/70">
        Damit Karte, Orts-Suche und Routen funktionieren, brauchst du einen
        Google-Maps-API-Key mit aktivem Billing.
      </p>
      <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        <li>
          Öffne die{' '}
          <a
            className="inline-flex items-center gap-1 text-terracotta underline"
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noreferrer"
          >
            Google Cloud Console <ExternalLink className="h-3 w-3" />
          </a>
          .
        </li>
        <li>
          Aktiviere die APIs: <strong>Maps JavaScript API</strong>,{' '}
          <strong>Places API</strong>, <strong>Directions API</strong>.
        </li>
        <li>
          Erstelle einen API-Key und beschränke ihn auf HTTP-Referrer (z.&nbsp;B.{' '}
          <code className="rounded bg-cream-dark px-1">
            https://&lt;username&gt;.github.io/roman-holiday-planner/*
          </code>
          ).
        </li>
        <li>Setze Tages-Quotas auf allen drei APIs (z.&nbsp;B. 500 Requests / Tag).</li>
        <li>
          Kopiere{' '}
          <code className="rounded bg-cream-dark px-1">.env.local.example</code>{' '}
          zu <code className="rounded bg-cream-dark px-1">.env.local</code> und trage den
          Key ein:
          <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-cream">
{`VITE_GOOGLE_MAPS_API_KEY=dein-key-hier`}
          </pre>
        </li>
        <li>
          Dev-Server neu starten:{' '}
          <code className="rounded bg-cream-dark px-1">npm run dev</code>
        </li>
      </ol>
      <p className="text-xs text-ink/50">
        Die App funktioniert bis dahin im Offline-Modus: POI-Liste ist
        benutzbar, Likes werden gespeichert, nur Karte &amp; Routing sind gesperrt.
      </p>
    </div>
  );
}
