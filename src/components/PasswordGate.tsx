import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { Lock, Sparkles } from 'lucide-react';

const SESSION_KEY = 'rhp:unlocked';

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface Props {
  children: ReactNode;
}

export function PasswordGate({ children }: Props) {
  const expectedHash = (import.meta.env.VITE_APP_PASSWORD_SHA256 as string | undefined)?.trim();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!expectedHash) return true; // no password set → open
    return sessionStorage.getItem(SESSION_KEY) === '1';
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expectedHash) setUnlocked(true);
  }, [expectedHash]);

  if (unlocked) return <>{children}</>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    const hash = await sha256(input);
    if (hash === expectedHash?.toLowerCase()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      setInput('');
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6 bg-cream">
      <div
        className={`w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg shadow-ink/10 ${
          error ? 'animate-shake' : ''
        }`}
      >
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-terracotta/10 p-4 text-terracotta">
            <Lock className="h-7 w-7" />
          </div>
        </div>
        <h1
          className="mb-2 text-center text-3xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Roman Holiday Planner
        </h1>
        <p className="mb-6 text-center text-sm text-ink/60">
          Nur für unsere beiden Familien <Sparkles className="inline h-4 w-4 text-ocker" />
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Passwort"
            autoFocus
            className="w-full rounded-2xl border border-cream-dark bg-cream px-4 py-3 text-ink outline-none focus:border-terracotta focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-terracotta px-4 py-3 font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-60"
          >
            Entsperren
          </button>
        </form>
        {error && (
          <p className="mt-3 text-center text-sm text-terracotta">
            Falsches Passwort
          </p>
        )}
        <p className="mt-6 text-center text-xs text-ink/40">
          Kein echter Zugriffsschutz — nur ein Riegel gegen zufällige Besucher.
        </p>
      </div>
    </div>
  );
}
