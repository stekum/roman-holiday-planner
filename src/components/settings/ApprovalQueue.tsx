import { useEffect, useState } from 'react';
import { Check, ShieldCheck, UserMinus, UserX, Users } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { getFirebase } from '../../firebase/firebase';
import type { UserProfile, UserStatus } from '../../firebase/useUserProfile';

/**
 * Admin-only UI showing ALL users with their approval status. Originally
 * only pending requests were shown — but that hid approved users which
 * made it hard to audit who has access. Now renders three sections:
 * pending, approved, and (if any) rejected. Also shows a uid-fallback
 * identifier for users where email/displayName were not captured (so
 * those users are at least distinguishable from each other).
 */
export function ApprovalQueue() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebase();
    // Listen to the whole users collection — admin is allowed by rules.
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            uid: d.id,
            email: data.email ?? null,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
            status: (data.status as UserStatus) ?? 'pending',
            createdAt: (data.createdAt as { toMillis?: () => number })?.toMillis?.(),
          });
        });
        // Sort: newest first inside each status bucket (handled by the
        // per-section renderer below).
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setUsers(list);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('[ApprovalQueue] listener error:', err);
        setError(err.message);
      },
    );
    return unsub;
  }, []);

  const setStatus = async (uid: string, status: UserStatus) => {
    setBusyUid(uid);
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, 'users', uid), { status });
    } catch (err) {
      console.error('[ApprovalQueue] update failed:', err);
      setError((err as Error).message);
    } finally {
      setBusyUid(null);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('Diesen Eintrag endgültig löschen? Der User bleibt in Firebase Auth bestehen und würde beim nächsten Login neu als pending entstehen.')) return;
    setBusyUid(uid);
    try {
      const { db } = getFirebase();
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error('[ApprovalQueue] delete failed:', err);
      setError((err as Error).message);
    } finally {
      setBusyUid(null);
    }
  };

  const pending = users.filter((u) => u.status === 'pending');
  const approved = users.filter((u) => u.status === 'approved');

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-ink" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Benutzer
        </h2>
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-terracotta/10 p-3 text-xs text-terracotta">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {/* Pending */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/60">
              Zugriffsanfragen
            </h3>
            {pending.length > 0 && (
              <span className="rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-semibold text-white">
                {pending.length}
              </span>
            )}
          </div>
          {pending.length === 0 ? (
            <p className="text-xs text-ink/40">Keine offenen Anfragen.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((u) => (
                <UserRow
                  key={u.uid}
                  user={u}
                  busy={busyUid === u.uid}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => void setStatus(u.uid, 'approved')}
                        disabled={busyUid === u.uid}
                        className="flex items-center gap-1 rounded-full bg-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Freigeben
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUser(u.uid)}
                        disabled={busyUid === u.uid}
                        className="flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                        aria-label="Ablehnen / Löschen"
                        title="Ablehnen / Löschen"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </div>

        {/* Approved */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-ink/40" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/60">
              Freigegeben ({approved.length})
            </h3>
          </div>
          {approved.length === 0 ? (
            <p className="text-xs text-ink/40">Keine freigegebenen User.</p>
          ) : (
            <ul className="space-y-2">
              {approved.map((u) => (
                <UserRow
                  key={u.uid}
                  user={u}
                  busy={busyUid === u.uid}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => void setStatus(u.uid, 'pending')}
                        disabled={busyUid === u.uid}
                        className="flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-ocker/20 hover:text-ocker-dark disabled:opacity-50"
                        title="Freigabe widerrufen (zurück auf pending)"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUser(u.uid)}
                        disabled={busyUid === u.uid}
                        className="flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                        aria-label="Löschen"
                        title="Löschen (User kommt bei Next Login als pending wieder)"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function UserRow({
  user,
  busy,
  actions,
}: {
  user: UserProfile;
  busy: boolean;
  actions: React.ReactNode;
}) {
  // Fallback chain: displayName → email → "User <uid-prefix>".
  // Guarantees every row has at least one distinguishable identifier.
  const shortUid = user.uid.slice(0, 8);
  const primary =
    user.displayName ||
    user.email ||
    `User ${shortUid}…`;
  const secondary =
    user.email && user.displayName
      ? user.email
      : `uid: ${shortUid}…`;
  const initials = (user.displayName ?? user.email ?? shortUid)
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hasIdentity = !!(user.displayName || user.email);

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl p-3 ${
        hasIdentity ? 'bg-cream' : 'bg-terracotta/5 ring-1 ring-terracotta/20'
      } ${busy ? 'opacity-60' : ''}`}
      title={`uid: ${user.uid}`}
    >
      {user.photoURL ? (
        <img
          src={user.photoURL}
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
        <p className="truncate text-sm font-semibold text-ink">{primary}</p>
        <p className="truncate text-xs text-ink/60">{secondary}</p>
        {!hasIdentity && (
          <p className="mt-0.5 text-[10px] text-terracotta">
            ⚠ Profil unvollständig — weder Name noch Email in Firestore
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 gap-1">{actions}</div>
    </li>
  );
}
