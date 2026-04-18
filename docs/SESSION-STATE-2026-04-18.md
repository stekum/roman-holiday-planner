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

---

# Nachtrag: #169 Debugging-Session (abends)

## Ziel vs. Ergebnis

**Ziel:** Bug #169 fixen — AI Tages-Briefing rendert mehrfach identisch + mit Content vom falschen Tag.

**Ergebnis:** Nicht gelöst. Root-Cause aber lokalisiert; Fix-Richtung bekannt. Auf morgen geparkt.

## Was heute an #169 gelandet ist (auf `main` + Beta)

- **Dedup-Pass** in `src/lib/briefingDedup.ts` — pure Funktion + 9 Unit-Tests unter `scripts/test-briefing-dedup.ts` (`npm run test:briefing-dedup`). Greift nur wenn Gemini den Text mit `\n\n`-getrennten Duplikaten liefert — tut er derzeit nicht (siehe Befund unten). Harmlos, keine Regression.
- **Prompt-Hardening** in `aiDayBriefing.ts` gegen „erster Tag"-Halluzination — greift auf Tag 1 nach Test. Kostenlose Verbesserung für neue Gens.
- **clearDay-Fix** in `useWorkspace.ts` — löscht jetzt auch `dayBriefings.<dayIso>` und `dayDescriptions.<dayIso>`, nicht nur `tripPlan`. Vorher blieben alte korrupte Briefings nach „Tagesplan leeren" stehen.

Commits: `628f44c` (Dedup + Prompt), `0f4c4ec` (clearDay + Unit-Tests).

## Was NICHT gefixt ist (der eigentliche Bug)

**Symptom:** Im Reise-Tab werden 3-6 identische DayBriefingCards untereinander gerendert. Alle zeigen denselben Briefing-Text (in unseren Tests meist Tag-1-Content, unabhängig vom aktiven Tab).

**Harte Daten aus Playwright-Debugging auf Beta:**
- DayPlanner-Parent mountet **1×** — nur Child DayBriefingCard mountet mehrfach.
- `useEffect(() => ..., [])` in DayBriefingCard feuert **3-6× mit unterschiedlichen IDs**, **0 Unmounts**. D.h. 3-6 parallele Component-Instanzen als Siblings im DOM.
- JSX-Source hat genau `{dayBriefing && <DayBriefingCard key={activeDay} … />}` — ein Element. Im deployed Bundle auch nur 1 `jsx(RD, …)`-Call (grep).
- Cards akkumulieren über die Zeit (2 → 4 → 5 → 6 über 7 Sekunden). Tab-Switch „Entdecken" und zurück resettet den Counter.
- **Ohne StrictMode** (main.tsx `<StrictMode>` entfernt, temporär getestet): DayPlanner mountet 1×, DayBriefingCard **0×**, 0 Cards im DOM — die App lädt Firestore-Data nicht.

**Root-Cause-Hypothese:** Race-Condition im `useWorkspace.ts:121-200` async-Subscription-Setup kombiniert mit dem Lazy-init von `activeDay` in `App.tsx:180`. StrictMode's Dev-Mode double-invoke kompensiert den Bug in Dev — in Prod (Rolldown-built) produziert die Kompensation aber 3-6 parallele Card-Mounts statt 1. Ohne StrictMode fehlt die Kompensation → Data-Init failed → 0 Cards.

**Belege gegen andere Hypothesen (durchgespielt und ausgeschlossen):**
- Nicht Service-Worker-Cache allein: Der 5×-Mount ist im NEUEN Code mit SW-disabled auch da.
- Nicht DayPlanner-Mehrfach-Mount: Parent mountet 1×, nur Child multi-mountet.
- Nicht direkte DOM-Manipulation / Portal: `grep` findet keine innerHTML/insertAdjacent/cloneNode/outerHTML-Aufrufe im Source.
- Nicht Animation-Library: Kein framer-motion o.ä. im `package.json`.
- Nicht Text-Duplikation im Briefing-String: Firestore enthält je Tag 1× den richtigen Briefing, `<p className="whitespace-pre-line">` rendert 1 Absatz — die 3-6 Blöcke sind **3-6 separate `<div>`-Cards**, keine 3-6 Absätze in einer Card.

## Sekundärer Befund: Service-Worker-Cache-Drift

Bei aktivem SW bekommt der Browser eine Mischung aus alter und neuer JS — deshalb sieht Stefan auf Phone oft sogar nach Hard-Reload noch alte Versionen. Fix-Propagation braucht: DevTools → Application → Service Workers → „Unregister" + Storage „Clear site data". Dokumentiert für morgen.

## Diagnose-Artefakte (committed als E2E-Scripts)

Alle unter `e2e/issue-169-*.e2e.js`:
- `briefing-response-capture` — versucht Gemini-Response zu interceptieren (hat bei mir nicht gematched, Filter zu eng)
- `card-count-over-time` — zeigt Akkumulation: 2→4→5→6 Cards in 7s
- `card-outerhtml` — beweist dass alle Cards byte-identische outerHTML haben
- `count-cards` — zählt Cards pro Mount
- `dom-inspection` — prüft Parent-Hierarchie und verwandte Elemente
- `dom-raw` — dumpt Parent-Children-Struktur
- `dump-all-briefings` — iteriert über 7 Tag-Tabs (zeigt: jeder Tab hat Tag-1-Text)
- `mount-trace` — zählt MOUNT/UNMOUNT über 7s
- `no-sw` — testet mit `--disable-features=ServiceWorker`
- `structure-check` — zählt verwandte DayPlanner-Elemente

Diese Scripts bleiben im Repo als Test-Werkzeuge für die morgige Session.

## Nächste Schritte (morgen)

1. **Time-Box: 30-60 min** für einen gezielten Root-Cause-Fix-Versuch. Wenn nicht gelöst: weiter parken.
2. **Fix-Richtung:** `useWorkspace.ts:121-200` umbauen — async `run()` in useEffect hat einen Race-Path wo `cancelled=true` den subscription-setup nicht blockt (subscriptions werden nach `cancelled=true` noch assigned). Zu prüfen ob das den Multi-Mount erklärt.
3. **Alternative Fix-Richtung:** `App.tsx:180` `activeDay` useState initialen Wert stabiler machen — der Lazy-Init `() => days[0] ?? ''` produziert beim first-render ein leeres '', beim re-render dann `days[0]`. Das ist Standard-Pattern aber könnte Cards als Siblings akkumulieren wenn `{dayBriefing && <… key={activeDay} …>}` bei jedem Re-Render ein neues Element mit neuem key erzeugt und React den alten nicht unmountet.
4. **Key-Hypothese testen:** Log `activeDay` an jeder Stelle im `DayBriefingCard`-useEffect. Wenn die 3-6 Mounts **unterschiedliche** activeDay-Values haben → key-driven Multi-Mount ohne Unmount. Wenn **gleiche** activeDay-Values → anderer Grund.
5. **Build-Tool-Hypothese:** Vite-Config hat `@vitejs/plugin-react`. Prüfen ob Vite 6+ unter der Haube Rolldown nutzt und StrictMode-Artefakte erzeugt. Test: `npx vite build --mode development` und vergleichen.

## Status Beta/Prod

- **Prod:** Unverändert (Commit `d60b437 docs: mark #167 done` ist Prod-Stand).
- **Beta:** Stand nach letztem heutigem Deploy = Commit `0f4c4ec` (inkl. Dedup + clearDay-Fix + Prompt-Hardening, OHNE Diagnose-Logs).
- **Diff Beta vs Prod:** Dedup + clearDay-Fix + Prompt-Hardening — alle unschädlich, keine Regression.

## Lessons Learned (für Memory-Follow-up)

- Bei „Fix greift nicht" niemals blind deployen — **erst tracen wo der gerenderte Wert herkommt**. Ich habe heute 3× den falschen Layer gepatcht (erst Dedup, dann Milestone-Description, dann clearDay), bevor ich die Playwright-Diagnose gemacht habe. Die Diagnose hätte als erstes kommen müssen.
- Bei Akkumulations-Bugs: **Mount-Log mit eindeutiger ID** in `useEffect(..., [])` direkt einbauen. Das ist in 5 Minuten gemacht und gibt harte Daten statt Hypothesen.
- Service Worker + PWA verdeckt Fix-Propagation. Bei Visual-Bug-Tests immer: Incognito-Window verwenden ODER SW unregister dokumentieren.
- `StrictMode`-Kompensation ist ein **Code-Smell**: wenn das Entfernen von StrictMode die App bricht, ist ein Race-Condition da. Das ist nicht akzeptabel und muss unabhängig vom #169-Fix behoben werden.
