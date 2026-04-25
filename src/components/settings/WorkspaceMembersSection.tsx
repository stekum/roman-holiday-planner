import { useEffect, useState } from 'react';
import { Crown, Link as LinkIcon, Trash2, UserMinus, Users } from 'lucide-react';
import {
  arrayRemove,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { getFirebase } from '../../firebase/firebase';
import { forgetWorkspace } from '../../firebase/knownWorkspaces';
import { useActiveWorkspaceId } from '../../firebase/workspaceContext';
import { createInvite } from '../../lib/invites';

interface MemberProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface WorkspaceState {
  ownerUid: string | null;
  memberIds: string[];
}

/**
 * #228 — Owner & member management for the active workspace.
 *
 * Subscribes directly to workspaces/{id} for ownerUid + memberIds, then
 * fetches each member's user profile (one-shot — profile changes are rare).
 * Renders:
 *  - Member list with owner badge
 *  - Owner-only: Share-Link generator (createInvite)
 *  - Owner-only: Remove-member buttons
 *  - Owner-only: Transfer-ownership (promote a member to owner)
 *  - Owner-only: Delete-workspace (hard delete with confirm)
 *
 * Members see a read-only list. Cloud Function syncWorkspaceMembers mirrors
 * memberIds onto users.{uid}.workspaceIds — UI doesn't need to touch that.
 */
export function WorkspaceMembersSection() {
  const workspaceId = useActiveWorkspaceId();
  const { db, auth } = getFirebase();
  const myUid = auth.currentUser?.uid ?? null;

  const [ws, setWs] = useState<WorkspaceState | null>(null);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<{ url: string; expiresAt: Date } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Subscribe to workspace doc for ownerUid + memberIds.
  useEffect(() => {
    setWs(null);
    setProfiles({});
    setShare(null);
    setError(null);

    const unsub = onSnapshot(
      doc(db, 'workspaces', workspaceId),
      (snap) => {
        if (!snap.exists()) {
          setWs(null);
          return;
        }
        const data = snap.data();
        setWs({
          ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : null,
          memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
        });
      },
      (err: FirestoreError) => {
        setError(err.message);
      },
    );
    return unsub;
  }, [workspaceId, db]);

  // Fetch profiles for current member set. Re-runs when memberIds changes.
  useEffect(() => {
    if (!ws) return;
    const missing = ws.memberIds.filter((uid) => !profiles[uid]);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (!snap.exists()) {
            return [uid, { uid, email: null, displayName: null, photoURL: null }] as const;
          }
          const d = snap.data();
          return [
            uid,
            {
              uid,
              email: typeof d.email === 'string' ? d.email : null,
              displayName: typeof d.displayName === 'string' ? d.displayName : null,
              photoURL: typeof d.photoURL === 'string' ? d.photoURL : null,
            },
          ] as const;
        } catch {
          return [uid, { uid, email: null, displayName: null, photoURL: null }] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, prof] of entries) next[uid] = prof;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ws, db, profiles]);

  if (error) {
    return (
      <section className="rounded-3xl border border-terracotta/40 bg-white p-5">
        <p className="text-sm text-terracotta">Mitglieder können nicht geladen werden: {error}</p>
      </section>
    );
  }

  if (!ws) {
    return (
      <section className="rounded-3xl border border-ink/10 bg-white p-5">
        <p className="text-sm text-ink/40">Lade Mitglieder…</p>
      </section>
    );
  }

  const isOwner = myUid !== null && ws.ownerUid === myUid;

  async function handleShare() {
    setBusy('share');
    try {
      const { url, expiresAt } = await createInvite(workspaceId);
      setShare({ url, expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function copyShareLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setBusy('copied');
      setTimeout(() => setBusy(null), 1500);
    } catch {
      // Some browsers block clipboard without secure context — show URL inline as fallback
    }
  }

  async function handleRemoveMember(uid: string) {
    if (!ws || uid === ws.ownerUid) return;
    if (!confirm('Mitglied wirklich aus diesem Trip entfernen?')) return;
    setBusy(`rm:${uid}`);
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        memberIds: arrayRemove(uid),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleTransferOwner(uid: string) {
    if (!ws || uid === ws.ownerUid) return;
    const target = profiles[uid];
    const label = target?.displayName || target?.email || uid;
    if (
      !confirm(
        `Eigentümerschaft an ${label} übergeben? Du verlierst die Owner-Rechte (Mitglieder verwalten, Trip löschen). Du bleibst Mitglied.`,
      )
    ) {
      return;
    }
    setBusy(`xfer:${uid}`);
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        ownerUid: uid,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  // Local-only sort: owner first, then alphabetical by display name
  const sortedMembers = [...ws.memberIds].sort((a, b) => {
    if (a === ws.ownerUid) return -1;
    if (b === ws.ownerUid) return 1;
    const aName = (profiles[a]?.displayName || profiles[a]?.email || a).toLowerCase();
    const bName = (profiles[b]?.displayName || profiles[b]?.email || b).toLowerCase();
    return aName.localeCompare(bName);
  });

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-olive" />
        <h2 className="text-lg font-semibold text-olive-dark">Mitglieder</h2>
        <span className="ml-auto text-xs text-ink/40">{ws.memberIds.length}</span>
      </div>

      {!ws.ownerUid && (
        <p className="mb-3 rounded-lg bg-ocker-light/30 p-2 text-xs text-ink/70">
          Dieser Trip hat noch keinen Owner — wird beim nächsten Schreiben gesetzt.
        </p>
      )}

      <ul className="space-y-1">
        {sortedMembers.map((uid) => {
          const p = profiles[uid];
          const isThisOwner = uid === ws.ownerUid;
          const isMe = uid === myUid;
          const label = p?.displayName || p?.email || uid;
          const sub = p?.email && p?.displayName ? p.email : null;
          return (
            <li
              key={uid}
              className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-cream/60"
            >
              {p?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-xs uppercase text-ink/50">
                  {label.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-ink">{label}</span>
                  {isThisOwner && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-ocker-light/60 px-1.5 py-0.5 text-[10px] font-semibold text-olive-dark"
                      title="Owner"
                    >
                      <Crown className="h-2.5 w-2.5" />
                      Owner
                    </span>
                  )}
                  {isMe && (
                    <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] text-ink/50">
                      Du
                    </span>
                  )}
                </div>
                {sub && <span className="block truncate text-[11px] text-ink/40">{sub}</span>}
              </div>

              {isOwner && !isThisOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTransferOwner(uid)}
                    disabled={busy === `xfer:${uid}`}
                    title="Eigentümerschaft übergeben"
                    aria-label={`Eigentümerschaft an ${label} übergeben`}
                    className="rounded-lg p-1.5 text-ink/30 opacity-0 transition hover:bg-ocker-light/40 hover:text-olive-dark group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(uid)}
                    disabled={busy === `rm:${uid}`}
                    title="Aus Trip entfernen"
                    aria-label={`${label} entfernen`}
                    className="rounded-lg p-1.5 text-ink/30 opacity-0 transition hover:bg-terracotta/10 hover:text-terracotta group-hover:opacity-100 disabled:opacity-50"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {isOwner && (
        <div className="mt-4 border-t border-cream-dark pt-4">
          {!share ? (
            <button
              type="button"
              onClick={handleShare}
              disabled={busy === 'share'}
              className="flex items-center gap-2 rounded-2xl bg-olive px-4 py-2 text-sm font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
            >
              <LinkIcon className="h-4 w-4" />
              {busy === 'share' ? 'Link wird erstellt…' : 'Einladungs-Link erstellen'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink/60">
                Link kopieren und teilen (z.B. WhatsApp). Gültig bis{' '}
                <strong>{share.expiresAt.toLocaleDateString('de-DE')}</strong>, einmalig
                einlösbar.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={share.url}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-cream/50 px-2 py-1.5 text-xs text-ink"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="rounded-lg bg-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-olive-dark"
                >
                  {busy === 'copied' ? 'Kopiert ✓' : 'Kopieren'}
                </button>
                <button
                  type="button"
                  onClick={() => setShare(null)}
                  className="rounded-lg bg-ink/5 px-2 py-1.5 text-xs text-ink/60 hover:bg-ink/10"
                  aria-label="Schließen"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <DangerZone workspaceId={workspaceId} />
      )}
    </section>
  );
}

/**
 * Owner-only — hard delete the workspace and all its POIs. Cascade via Cloud
 * Function would be cleaner, but for the small data sizes involved a client-
 * side cascade with a confirm step is fine.
 */
function DangerZone({ workspaceId }: { workspaceId: string }) {
  const { db } = getFirebase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !confirm(
        `Trip "${workspaceId}" wirklich vollständig löschen? Alle POIs und der Tagesplan gehen unwiderruflich verloren.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Note: Firestore Rules allow only the owner to delete the workspace
      // doc. POI subcollection deletion happens via the same rule chain
      // (allow delete: if isOwner). For larger datasets, move this to a
      // Cloud Function with batch delete.
      const { deleteDoc, collection, getDocs } = await import('firebase/firestore');
      const poisSnap = await getDocs(collection(db, 'workspaces', workspaceId, 'pois'));
      await Promise.all(poisSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'workspaces', workspaceId));
      // The trip-switcher still has this workspace in localStorage — purge.
      try {
        forgetWorkspace(workspaceId);
      } catch {
        /* noop */
      }
      // Reload to reset the active-workspace state cleanly.
      location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-cream-dark pt-4">
      <p className="mb-2 text-xs text-ink/40">Owner-Bereich</p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="flex items-center gap-2 rounded-2xl border-2 border-terracotta bg-white px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta hover:text-white disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {busy ? 'Lösche…' : 'Trip löschen'}
      </button>
      {error && <p className="mt-2 text-xs text-terracotta">Fehler: {error}</p>}
    </div>
  );
}
