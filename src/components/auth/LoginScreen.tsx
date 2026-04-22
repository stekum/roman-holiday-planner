import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  signInWithGoogle,
  signInWithMicrosoft,
} from '../../firebase/firebase';

type Provider = 'google' | 'microsoft';

export function LoginScreen() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    setError(null);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithMicrosoft();
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          'Anmeldung fehlgeschlagen. Bitte versuch es erneut.',
      );
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg shadow-ink/10">
        <h1
          className="mb-2 text-center text-3xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Holiday Planner
        </h1>
        <p className="mb-8 text-center text-sm text-ink/60">
          Nur für unsere beiden Familien{' '}
          <Sparkles className="inline h-4 w-4 text-ocker" />
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleSignIn('google')}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-cream-dark bg-white px-4 py-3 font-semibold text-ink shadow-sm transition hover:bg-cream disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {busy === 'google' ? 'Anmeldung läuft…' : 'Mit Google anmelden'}
          </button>

          <button
            type="button"
            onClick={() => void handleSignIn('microsoft')}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-cream-dark bg-white px-4 py-3 font-semibold text-ink shadow-sm transition hover:bg-cream disabled:opacity-60"
          >
            <MicrosoftIcon className="h-5 w-5" />
            {busy === 'microsoft' ? 'Anmeldung läuft…' : 'Mit Microsoft anmelden'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-terracotta">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-ink/40">
          Neue Accounts müssen einmalig vom Admin freigegeben werden.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
