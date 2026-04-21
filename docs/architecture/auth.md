# Architecture: Authentication & Authorization

## Overview

Firebase Authentication via OAuth (Google + Microsoft). Nach Login entsteht ein Firestore-User-Dokument mit `status='pending'`. Erst nach manueller Freigabe durch Admin darf der User den Workspace sehen.

```
 User klickt "Sign in"
        │
        ▼
┌─────────────────────────┐
│  Firebase signIn        │
│  (Google | Microsoft)   │
└──────────┬──────────────┘
           │ uid, email, displayName
           ▼
┌─────────────────────────┐
│  AuthGate               │       ┌──────────────────────┐
│  users/{uid} upsert ───►│──────▶│ Cloud Function:      │
│  status = 'pending'     │       │ notifyAccessRequest  │
└──────────┬──────────────┘       │ → Email an Admin     │
           │                      └──────────────────────┘
           ▼
   status === 'approved'?  ───No──▶  "Warten auf Freigabe" UI
           │ Yes
           ▼
   Workspace laden (Firestore listeners starten)
```

## Participants

### `AuthGate` ([src/components/auth/AuthGate.tsx](../../src/components/auth/AuthGate.tsx))
- Wraps den Haupt-App-Content; rendert Login-UI wenn kein User
- Bei erfolgreichem Login: legt `users/{uid}`-Dokument mit `status='pending'` an, falls noch nicht da
- Bei `status !== 'approved'`: zeigt „Warten auf Freigabe"-Fallback

### `useAuth` ([src/hooks/](../../src/hooks/))
- React-Hook, der Firebase-Auth-Status + User-Doc beobachtet
- E2E-Test-Flow: liest `rhp:e2e-token` aus sessionStorage → ruft `signInWithCustomToken` (siehe [`scripts/mint-e2e-token.mjs`](../../scripts/mint-e2e-token.mjs))

### Cloud Function: `notifyAccessRequest` ([functions/index.js](../../functions/index.js))
- Triggert bei `users/{uid}`-Write wenn `status === 'pending'` (nur bei Transition)
- Sendet Mail an `NOTIFY_TO_EMAIL` via Resend API
- Graceful Fallback wenn `RESEND_API_KEY` fehlt

## Admin Config

**Single-Admin-Modell:** `stefan.kummert@gmail.com` ist als Admin hardcoded an zwei Stellen (bewusst redundant, siehe CLAUDE-Cross-Reference in Rules):
- [`firestore.rules`](../../firestore.rules) — `isAdmin()` function
- [`src/firebase/adminConfig.ts`](../../src/firebase/adminConfig.ts) — Client-side Admin-Check für UI

Admin sieht im Settings-Tab alle User + Approve-Buttons.

## Firestore Security Rules

Siehe [`firestore.rules`](../../firestore.rules). Kern:

```javascript
function isAdmin() { ... email === 'stefan.kummert@gmail.com' ... }
function isApproved() { ... users/{uid}.status === 'approved' ... }

// workspaces/{workspaceId}: read/write nur approved OR admin
// users/{uid}: read own, write own status='pending' only; admin kann alles
```

**Wichtig:** Rules-Änderungen werden **nicht automatisch** deployed. Manuell via:
```bash
firebase deploy --only firestore:rules
```

## External Setup Steps (einmalig)

### Google Sign-In
- Firebase Console → Authentication → Sign-in method → Google: enabled
- Support-Email eintragen, sonst fehlt die OAuth-Consent-Page

### Microsoft Sign-In
- Firebase Console → Authentication → Sign-in method → Microsoft: enabled
- Azure AD App registrieren: https://portal.azure.com
  - Redirect URI: `https://<projekt>.firebaseapp.com/__/auth/handler`
  - Supported account types: „Personal Microsoft accounts only" (für Familien-Use-Case)
- Client-ID + Client-Secret in Firebase Console eintragen

### Authorized Domains (für OAuth-Redirect)
Firebase Console → Authentication → Settings → Authorized domains. Muss enthalten:
- `stekum.github.io` (Prod + Beta)
- `localhost` (Dev)

## Known Issues / Lessons Learned

- **Anonymous Auth** wurde in #112 abgeschaltet. Zombie-Anonymous-Sessions können nach Migration in Firestore hängen — siehe [AGENTS.md Lessons Learned](../../AGENTS.md#zombie-anonymous-sessions-nach-auth-migration).
- **Firestore-Rules deployen** wird regelmäßig vergessen. Pre-Release-Checkliste weist explizit drauf hin, aber kein Automatismus.

## Related Issues

- #112 Auth-Migration
- #133 Email-Notification bei Zugriffsanfrage
- #151 Full user-management UI
