import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebase } from '../../firebase/firebase';
import { rememberWorkspace } from '../../firebase/knownWorkspaces';
import { useSetActiveWorkspaceId } from '../../firebase/workspaceContext';
import {
  clearInviteFromURL,
  readInviteFromURL,
  redeemInvite,
} from '../../lib/invites';

interface InvitePreview {
  workspaceId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  expiresAt: Date | null;
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'loading'; token: string }
  | { kind: 'preview'; token: string; preview: InvitePreview }
  | { kind: 'joining'; token: string; preview: InvitePreview }
  | { kind: 'error'; token: string; message: string };

/**
 * #228 — Recipient invite-acceptance flow.
 *
 * On mount: reads ?invite=<token> from the URL. If present:
 *  1. Loads the invite doc + the inviter's user profile to render
 *     "X hat dich zu Y eingeladen"
 *  2. User clicks "Beitreten" → calls redeemInvite Callable
 *  3. On success: switch active workspace, remember it, clear URL, close modal
 *  4. On "Später": clear URL only, leave membership unchanged
 *
 * Family selection happens after the user is in the new workspace, via the
 * existing MyFamilyEditor in Settings — keep this modal focused.
 */
export function InviteAcceptModal() {
  const setActiveWorkspaceId = useSetActiveWorkspaceId();
  const [state, setState] = useState<ModalState>({ kind: 'closed' });

  useEffect(() => {
    const token = readInviteFromURL();
    if (!token) return;
    let cancelled = false;
    setState({ kind: 'loading', token });

    void (async () => {
      try {
        const { db } = getFirebase();
        const inviteSnap = await getDoc(doc(db, 'invites', token));
        if (cancelled) return;
        if (!inviteSnap.exists()) {
          setState({ kind: 'error', token, message: 'Einladung wurde nicht gefunden oder ist abgelaufen.' });
          return;
        }
        const invite = inviteSnap.data();
        if (invite.used) {
          setState({ kind: 'error', token, message: 'Diese Einladung wurde bereits eingelöst.' });
          return;
        }
        const expiresAt = invite.expiresAt?.toDate?.() ?? null;
        if (expiresAt && Date.now() > expiresAt.getTime()) {
          setState({ kind: 'error', token, message: 'Diese Einladung ist abgelaufen.' });
          return;
        }

        let ownerName: string | null = null;
        let ownerEmail: string | null = null;
        if (typeof invite.createdBy === 'string') {
          try {
            const ownerSnap = await getDoc(doc(db, 'users', invite.createdBy));
            if (ownerSnap.exists()) {
              const o = ownerSnap.data();
              ownerName = typeof o.displayName === 'string' ? o.displayName : null;
              ownerEmail = typeof o.email === 'string' ? o.email : null;
            }
          } catch {
            /* fall through with nulls */
          }
        }

        if (cancelled) return;
        setState({
          kind: 'preview',
          token,
          preview: {
            workspaceId: typeof invite.workspaceId === 'string' ? invite.workspaceId : '?',
            ownerName,
            ownerEmail,
            expiresAt,
          },
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: 'error',
          token,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    clearInviteFromURL();
    setState({ kind: 'closed' });
  }

  async function accept() {
    if (state.kind !== 'preview') return;
    setState({ kind: 'joining', token: state.token, preview: state.preview });
    try {
      const { workspaceId } = await redeemInvite(state.token);
      rememberWorkspace(workspaceId);
      setActiveWorkspaceId(workspaceId);
      clearInviteFromURL();
      setState({ kind: 'closed' });
    } catch (err) {
      // err.code matches HttpsError codes — already-exists, deadline-exceeded, etc.
      const code =
        (err as { code?: string }).code ?? 'unknown';
      const message = (err as { message?: string }).message ?? 'Beitritt fehlgeschlagen.';
      const friendly =
        code === 'functions/already-exists' || code === 'already-exists'
          ? 'Diese Einladung wurde inzwischen schon eingelöst.'
          : code === 'functions/deadline-exceeded' || code === 'deadline-exceeded'
            ? 'Diese Einladung ist abgelaufen.'
            : code === 'functions/not-found' || code === 'not-found'
              ? 'Einladung wurde nicht gefunden.'
              : message;
      setState({ kind: 'error', token: state.token, message: friendly });
    }
  }

  if (state.kind === 'closed') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl bg-cream p-6 shadow-xl shadow-ink/20">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-olive" />
          <h2
            id="invite-modal-title"
            className="text-lg font-semibold text-olive-dark"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Trip-Einladung
          </h2>
        </div>

        {state.kind === 'loading' && (
          <div className="flex items-center gap-2 py-4 text-sm text-ink/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Einladung wird geprüft…
          </div>
        )}

        {(state.kind === 'preview' || state.kind === 'joining') && (
          <>
            <p className="mb-4 text-sm text-ink/80">
              <strong>{state.preview.ownerName || state.preview.ownerEmail || 'Jemand'}</strong>{' '}
              hat dich zu{' '}
              <span className="rounded bg-ocker-light/60 px-1.5 py-0.5 font-mono text-xs text-olive-dark">
                {state.preview.workspaceId}
              </span>{' '}
              eingeladen.
            </p>
            {state.preview.expiresAt && (
              <p className="mb-4 text-xs text-ink/40">
                Gültig bis {state.preview.expiresAt.toLocaleDateString('de-DE')}
              </p>
            )}
            <p className="mb-4 text-xs text-ink/60">
              Nach dem Beitritt: in den Einstellungen kannst du wählen, zu welcher Familie du
              gehörst.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={accept}
                disabled={state.kind === 'joining'}
                className="flex-1 rounded-2xl bg-olive px-4 py-2 text-sm font-semibold text-white hover:bg-olive-dark disabled:opacity-50"
              >
                {state.kind === 'joining' ? 'Beitreten…' : 'Beitreten'}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={state.kind === 'joining'}
                className="rounded-2xl bg-ink/5 px-4 py-2 text-sm text-ink/60 hover:bg-ink/10 disabled:opacity-50"
              >
                Später
              </button>
            </div>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <p className="mb-4 text-sm text-terracotta">{state.message}</p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-2xl bg-ink/5 px-4 py-2 text-sm text-ink/70 hover:bg-ink/10"
            >
              Schließen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
