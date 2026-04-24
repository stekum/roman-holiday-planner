# Architecture: Deployment

Zwei Environments — **Beta** und **Prod** — beide auf **Firebase Hosting** (separate Sites). Firestore-Rules und Cloud Functions werden separat über Firebase-CLI deployed (nicht auto).

> Hosting-Migration #117 hat 2026-04-22 GH-Pages als Primary abgelöst.
> Chore 2026-04-24 (Stefan): keine Updates mehr auf GH-Pages. Die gh-pages-URL bleibt stehen als frozen Fallback bis #213 (ab 2026-05-06) sie final abbaut.

## Environments

| Env | URL | Deploy-Trigger |
|---|---|---|
| Prod | https://holiday-planner.web.app/ | **manuell** (`npm run deploy` → triggert GitHub-Actions-Workflow) |
| Beta | https://holiday-planner-beta.web.app/ | **auto** bei push auf main (`deploy-firebase-beta.yml`) |

Prod wird bewusst nur manuell deployed (kein Auto-Risk nach Merge).

## Auto-Beta-Pipeline ([.github/workflows/deploy-firebase-beta.yml](../../.github/workflows/deploy-firebase-beta.yml))

```
push auf main
     │
     ▼
┌────────────────────────────┐
│ 1. npm ci                  │
│ 2. Write .env.local from   │   ◄── Secrets: VITE_FIREBASE_*,
│    repo secrets            │       VITE_GOOGLE_MAPS_API_KEY,
│                            │       VITE_GA_MEASUREMENT_ID (optional)
│ 3. Sanity-check values     │
│ 4. npm run build           │
│ 5. firebase deploy         │   ◄── deployed zum Beta-Hosting-Target
└────────────────────────────┘
     │
     ▼
Firebase Hosting CDN
     │ ~30s-1min lag
     ▼
holiday-planner-beta.web.app
```

**Wichtig:** Die `.env.local` wird **vor** dem Vite-Build geschrieben. Vite liest `import.meta.env.VITE_*` nur aus `.env*`-Files, nicht aus `process.env`. Siehe [Memory-Entry](../../../.claude/projects/-Users-stefankummert-Documents--Roman-Holidays/memory/) zu #188.

## Prod-Deploy (manuell)

```bash
# 1. Stand auf main ist ready
git status          # clean
git log --oneline -5 # last feat/fix merged

# 2. Optional: Beta-Smoke-Test im Browser

# 3. Deploy
npm run deploy
# Triggert "Deploy Firebase Prod"-Workflow auf GitHub-Actions
# (nicht mehr lokaler Build — sicherer gegen uncommitted-Deploys)
```

Alternativ direkt:
```bash
gh workflow run "Deploy Firebase Prod" -f confirm=deploy-prod
```

**Harte Regel:** Der Workflow builded aus dem gecheckten-out `main`-Branch. Uncommitted lokale Änderungen landen **nicht** in Prod (Vorteil gegenüber früherem `gh-pages -d dist` das den lokalen Working Tree nahm). Das Risiko aus dem #14-Incident ist damit strukturell weg. Siehe [AGENTS.md 🚨 Harte Regel](../../AGENTS.md#-harte-regel-niemals-uncommitted-deployen).

## Release-Flow (release-please, #173)

```
push auf main (mit feat:/fix:/perf: Commit)
     │
     ▼
Action: release-please-action
     │
     ▼
Erstellt/updated "Release PR" mit:
- Bump package.json + manifest
- Changelog aus Conventional Commits
- PR-Body = Release Notes
     │
     │ Stefan reviewed + merged
     ▼
Action setzt Tag vX.Y.Z + GitHub Release
```

Prod-Deploy bleibt **manuell** nach Release-PR-Merge. Bewusste Safety-Grenze.

## Firestore Rules deploy

**Nicht automatisch**, nach Änderung an [`firestore.rules`](../../firestore.rules):

```bash
firebase deploy --only firestore:rules
```

## Cloud Functions deploy

Nach Änderung in [`functions/`](../../functions/):

```bash
firebase deploy --only functions          # alle
firebase deploy --only functions:persistPoiPhoto  # einzelne
```

Secrets setzen:
```bash
firebase functions:secrets:set RESEND_API_KEY
```

Params (strings, non-secret):
Beim ersten Deploy fragt Firebase interaktiv — Werte landen in `functions/.env.<project>` (gitignored).

## Service Worker / PWA

`vite-plugin-pwa` generiert `sw.js` mit Workbox-Runtime:
- Google Maps APIs: NetworkFirst, 1h Cache, max 50 Einträge
- Firestore: NetworkFirst, 5min Cache, max 20 Einträge
- Statische Assets: Precached (Workbox manifest)

Nach Deploy kann Prod/Beta bis zu ~24h alte SW-Cache haben. Hard-Refresh (Cmd+Shift+R) ist das übliche Wartungs-Rezept — auf iOS Safari: Einstellungen → Safari → Erweitert → Website-Daten löschen.

## Rollback

Firebase Hosting hat First-Class-Rollback via Console:
1. Firebase Console → Hosting → Release-History
2. Älteren Build auswählen → "Rollback"
3. Geht in <1 Minute live

Alternativ: Git-Revert des problematischen Commits auf main → Beta-Auto-Deploy → `npm run deploy` für Prod.

## Monitoring

- **Firebase Console → Hosting** für Deploy-History und Traffic
- **Firebase Console → Functions → Logs** für Cloud-Function-Fehler
- **GA4 Realtime** (ab #123) für Traffic + Events
- **Google Cloud Billing** für API-Verbrauch — Uptime-Monitoring siehe #215

## Related Issues

- #170 CI Build+Lint PR-Gate
- #171 Auto-Deploy-Beta (obsolet seit #117 — Firebase-Beta-Workflow ersetzt)
- #173 Release-Please
- #117 Hosting-Migration zu Firebase (done 2026-04-22)
- #213 GH-Pages Sunset (ab 2026-05-06) — entfernt gh-pages branch + deaktiviert Pages komplett
