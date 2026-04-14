import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';
import { signOutUser } from '../../firebase/firebase';

interface Props {
  user: User;
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const initials = (user.displayName ?? user.email ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm shadow-ink/5 hover:shadow-md"
        aria-label="Benutzermenü"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-olive-dark">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 w-56 rounded-2xl bg-white p-3 shadow-lg shadow-ink/10">
          <div className="mb-2 flex items-center gap-2 border-b border-cream-dark pb-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-olive/20 text-xs font-semibold text-olive-dark">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {user.displayName && (
                <p className="truncate text-xs font-semibold text-ink">
                  {user.displayName}
                </p>
              )}
              <p className="truncate text-[10px] text-ink/50">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOutUser();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-ink/70 hover:bg-cream"
          >
            <LogOut className="h-3.5 w-3.5" />
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
