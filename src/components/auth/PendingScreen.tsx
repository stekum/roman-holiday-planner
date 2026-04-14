import { Clock, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';
import { signOutUser } from '../../firebase/firebase';

interface Props {
  user: User;
}

export function PendingScreen({ user }: Props) {
  const initials = (user.displayName ?? user.email ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-full items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg shadow-ink/10">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-ocker/15 p-4 text-ocker">
            <Clock className="h-7 w-7" />
          </div>
        </div>
        <h1
          className="mb-2 text-center text-2xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Warte auf Freigabe
        </h1>
        <p className="mb-6 text-center text-sm text-ink/60">
          Dein Account wurde erstellt und wartet auf die Bestätigung durch den
          Admin. Du bekommst Zugriff sobald du freigegeben wurdest.
        </p>

        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-cream p-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-olive/20 text-sm font-semibold text-olive-dark">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {user.displayName && (
              <p className="truncate text-sm font-semibold text-ink">
                {user.displayName}
              </p>
            )}
            <p className="truncate text-xs text-ink/60">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOutUser()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cream-dark bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-cream"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
