# Session-State 2026-04-18 — Stabilisierungs-Audit

Einmalige Momentaufnahme zum Ende einer langen Session in der zu viel parallel lief (v2.0-Quickwins + #167 Places-API-New + v1.5-Milestone-Cleanup + v1.5.1-Patch-Planung + #33 WIP + Board-Regen). Ziel dieses Dokuments: Trail für Stefan, was steht, was offen ist, was bewusst geparkt wurde.

**Siehe auch:** `AGENTS.md` → Release Management (autoritativ) und `docs/ROADMAP.md` (Versions-Status).

---

## Produktionsstand

- **main** = deployed auf Prod und Beta (beide identisch)
- Letzter Deploy-relevanter Commit: `d60b437 docs: mark #167 done (Places API (New) enrichment live on Prod)`
- Version live: v1.5.0 (+ v1.5.1-Follow-ups noch ausstehend, + v2.0-Quickwins bereits shippted ohne eigenen Release-Tag)
- Keine ungebraketten Zwischenstände, kein Deploy-Drift zwischen Beta und Prod

## Unversionierte lokale Änderungen

- `src/settings/types.ts` — **#33 WIP:** optionale Felder `timezone?: string` und `homeTimezone?: string` in `TripConfig` ergänzt
- `src/settings/tripConfig.ts` — **#33 WIP:** `timezone: 'Europe/Rome'` in `DEFAULT_TRIP_CONFIG`, plus Helfer `timezoneFromCountry`, `resolveHomeTimezone`, `formatTimeInZone`, `labelForTimezone`
- `.claude/settings.json` — Claude-Code-Drift, harmlos, ignoriert

Diese #33-WIP wird per Stash geparkt (siehe Phase 2).

## Feature-Branches

- `feat/issue-33-timezone-awareness` — trägt einen einzigen Commit `eeb48b3` der **identisch** zu `713802b` auf `main` ist (wurde cherry-picked). Ohne Rebase würde ein PR-Merge Doppel-Commits erzeugen. **Aktion:** Branch wird gelöscht (Phase 2), die #33-WIP geht in den Stash.

Keine weiteren offenen Feature-Branches.

## Milestones — offener Stand

### v1.5 — AI Features ✅ Released 2026-04-18
- Geschlossen, release-tag `v1.5.0` existiert, keine offenen Issues

### v1.5.1 — AI Follow-ups (Patch, offen)
- `#16` Smarter Instagram-Import — Size M, noch nicht gestartet
- `#43` AI Post-Trip-Analyse — Size M, noch nicht gestartet
- `#169` Bug: AI Tages-Briefing rendert mehrfach + falscher Tag-Content — Size S, noch nicht investigiert
- Kein Deadline-Druck, wird zwischen v2.0-Arbeit eingeplant

### v2.0 — Travel Essentials + Polish (in progress)
- ✅ geshippt (keine eigenen Release-Tags, weil v2.0 noch nicht geschlossen): `#51` Kommentare · `#48` Budget · `#38` Besuchsstatus · `#34` Currency · `#167` Places API (New) priceRange + Cuisine
- **Offen & halb-angefangen:**
  - `#33` Zeitzonen — types + Helper fertig (im Stash), UI-Teil (TimezoneIndicator, App.tsx, TripConfigEditor) fehlt
  - `#20` Kid-Score — noch nicht begonnen
- Offen & nicht gestartet: `#46` Packing List · `#73` Stadt-Konfiguration · `#117` Hosting-Migration · `#122` Multi-Language · `#132` GitHub+Email-Pass-Auth · `#140` Facebook-Auth · `#123`/`#133`/`#137`/`#154` (aus v1.5 geslipped)

## Backfill #167 — geparkt

Das Backfill-Script (`scripts/backfill-places-enrichment.mjs`) würde existierende POIs (vor #167 gespeichert) mit `priceRange` + `primaryType` anreichern. Zwei Wege beschrieben in `e2e/manual/issue-167-places-new-enrichment.md`:

- **Option A:** separater IP-restricted Server-Key in Google Cloud Console anlegen. Nach Backfill deaktivieren. Empfohlen.
- **Option B:** Referrer-Restriction am Prod-Key temporär lösen, Script laufen lassen, Restriction **sofort** zurücksetzen. Riskanter.

**Status:** Geparkt. Wird erst gezogen wenn Stefan explizit ok gibt.

## Board-Regen 2026-04-18

An diesem Tag wurden die Project-Board Release-Field-Options regeneriert (Backup+Remap) um `v1.5.1` als eigene Option aufs Board zu bringen. 102 Items wurden remapped. Verifikation via Spot-Query ok. Konvention in `AGENTS.md § Project Board Release-Feld ↔ GitHub-Milestone` dokumentiert (1:1 zu GitHub-Milestones, Regen-Prozedur ausgeschrieben).

**Wichtige Folge-Regel** (auch in Memory festgehalten): Regen ist ok, aber wird **vorher mit Stefan besprochen**. Nicht eigenmächtig.

## CI/CD — aktueller Stand (Kurzfassung)

- **Kein** GitHub Actions CI. **Kein** Pre-Push-Hook. **Kein** Pre-Commit-Lint.
- Semgrep gibt's lokal via Hook (#116).
- Build/Lint: manuell vor Commit (`npm run build && npm run lint`).
- Deploy: `npm run deploy:beta` → Stefan testet → `npm run deploy`. Beide Schritte manuell.
- Release-Tags: `gh release create ... --generate-notes`. Manuell.
- Milestones schliessen: `gh api .../milestones/N -X PATCH -f state=closed`. Manuell.

Ausführliche Fassung in `AGENTS.md § CI/CD — Aktueller Stand` (Phase 5 Ergebnis).

Future-Wünsche (CI-Automation, Auto-Deploy, E2E-im-CI, Semantic-Release) sind als eigene v2.0-Issues erfasst (Phase 5 Ergebnis).

## Nicht im heutigen Scope

- Keine neuen Features (weder #20 noch #33-UI)
- Keine neuen Deploys (Prod/Beta = main bleibt)
- Kein Board-Regen (der heutige hat geklappt, nicht noch mal anfassen)
- Kein #167-Backfill (bleibt geparkt)
- Kein #169-Fix (nur Verifikation der Issue-Doku)

## Close-out

- Commits für diese Session-Stabilisierung auf `main` gepusht
- Alles offen-bewusst ist via Issues/Milestones getrackt
- Nächste Session kann direkt mit einem klaren Startzustand beginnen

**Session beendet 2026-04-18 18:57 CEST.** Alle Stabilisierungs-Edits committed + gepusht auf `main`. `#33`-WIP liegt im Stash `wip-issue-33-timezone-types-helpers`. `feat/issue-33-timezone-awareness` gelöscht. Vier CI/CD-Future-Issues (#170, #171, #172, #173) in v2.0 angelegt. AGENTS.md Release-Management + neue CI/CD-Sektion konsistent. Memory zu ProjectV2-Field-Options um Regen-Etikette erweitert.
