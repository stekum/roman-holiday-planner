import { useEffect, useState } from 'react';
import { Check, ShieldCheck, UserX } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type FirestoreError,
} from 'firebase/firestore';
import { getFirebase } from '../../firebase/firebase';
import type { UserProfile } from '../../firebase/useUserProfile';

/**
 * Admin-only UI showing pending user approvals. Renders nothing if the current
 * user is not the admin (guarded at the parent level).
 */
export function ApprovalQueue() {
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebase();
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            uid: d.id,
            email: data.email ?? null,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
            status: 'pending',
            createdAt: (data.createdAt as { toMillis?: () => number })?.toMillis?.(),
          });
        });
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setPending(list);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('[ApprovalQueue] listener error:', err);
        setError(err.message);
      },
    );
    return unsub;
  }, []);

  const approve = async (uid: string) => {
    setBusyUid(uid);
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, 'users', uid), { status: 'approved' });
    } catch (err) {
      console.error('[ApprovalQueue] approve failed:', err);
      setError((err as Error).message);
    } finally {
      setBusyUid(null);
    }
  };

  const reject = async (uid: string) => {
    if (!confirm('Anfrage ablehnen und Account entfernen?')) return;
    setBusyUid(uid);
    try {
      const { db } = getFirebase();
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error('[ApprovalQueue] reject failed:', err);
      setError((err as Error).message);
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-ink" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Zugriffsanfragen
        </h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-semibold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-terracotta/10 p-3 text-xs text-terracotta">
          {error}
        </p>
      )}

      {pending.length === 0 ? (
        <p className="text-sm text-ink/60">Keine offenen Anfragen.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((u) => {
            const initials = (u.displayName ?? u.email ?? '?')
              .split(/\s+/)
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const busy = busyUid === u.uid;
            return (
              <li
                key={u.uid}
                className="flex items-center gap-3 rounded-2xl bg-cream p-3"
              >
                {u.photoURL ? (
                  <img
                    src={u.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-olive/20 text-xs font-semibold text-olive-dark">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {u.displayName && (
                    <p className="truncate text-sm font-semibold text-ink">
                      {u.displayName}
                    </p>
                  )}
                  <p className="truncate text-xs text-ink/60">{u.email}</p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => void approve(u.uid)}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-full bg-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Freigeben
                  </button>
                  <button
                    type="button"
                    onClick={() => void reject(u.uid)}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                    aria-label="Ablehnen"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
