# Architecture: Deployment

Zwei Environments — **Beta** und **Prod** — beide auf GitHub Pages, unterschiedliche Paths. Firestore-Rules und Cloud Functions werden separat über Firebase-CLI deployed (nicht auto).

## Environments

| Env | URL | Path | Build | Deploy-Trigger |
|---|---|---|---|---|
| Prod | https://stekum.github.io/roman-holiday-planner/ | `/` | `npm run build` | **manuell** (`npm run deploy`) |
| Beta | https://stekum.github.io/roman-holiday-planner/beta/ | `/beta/` | `npm run build:beta` | **auto** bei push auf main (#171) |

Prod wird bewusst nur manuell deployed (kein Auto-Risk nach Merge).

## Auto-Beta-Pipeline ([.github/workflows/deploy-beta.yml](../../.github/workflows/deploy-beta.yml))

```
push auf main
     │
     ▼
┌────────────────────────────┐
│ 1. npm ci                  │
│ 2. Write .env.local from   │   ◄── Secrets: VITE_FIREBASE_*,
│    repo secrets            │       VITE_GOOGLE_MAPS_API_KEY,
│                            │       VITE_GEMINI_API_KEY,
│                            │       VITE_GA_MEASUREMENT_ID (optional)
│ 3. Sanity-check values     │
│ 4. npm run build:beta      │
│ 5. peaceiris/gh-pages:     │   ◄── commit to gh-pages branch
│    push ./dist to beta/    │       destination_dir=beta
└────────────────────────────┘
     │
     ▼
Fastly CDN (GitHub Pages)
     │ ~1-10 min lag
     ▼
stekum.github.io/roman-holiday-planner/beta/
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
# läuft lokal: vite build (mit .env.local) + gh-pages push
```

**Harte Regel:** Niemals uncommittted Code deployen. `npm run deploy` nutzt den **lokalen Working Tree** — ungespeicherte Änderungen landen in Prod, auch wenn sie nicht in Git sind. Siehe [AGENTS.md 🚨 Harte Regel](../../AGENTS.md#-harte-regel-niemals-uncommitted-deployen).

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
Action setzt Tag v2.1.X + GitHub Release
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

Nach Deploy kann Prod/Beta bis zu ~24h alte SW-Cache haben. Hard-Refresh (Cmd+Shift+R) ist das übliche Wartungs-Rezept.

## Rollback

GitHub Pages hat kein First-Class-Rollback. Rollback = re-deploy eines älteren Commits:

```bash
git checkout <älterer-commit>
npm run deploy
git checkout main     # lokal zurück
```

Oder: gh-pages Branch per `git revert` manipulieren (selten nötig).

## Monitoring

- **Firebase Console → Functions → Logs** für Cloud-Function-Fehler
- **GA4 Realtime** (ab #123) für Traffic + Events
- **Google Cloud Billing** für API-Verbrauch — Alerts noch TODO (#180-Plan-Follow-up)

## Related Issues

- #170 CI Build+Lint PR-Gate
- #171 Auto-Deploy-Beta
- #173 Release-Please
- #117 Hosting-Migration (offen — evtl. Weg von GH-Pages)
