# Roadmap — Japan als Nordstern, v4.x als Langfrist-Ziel

> **Nordstern kurzfristig:** Multi-Trip-fähig + Japan-Ready bis **24. Mai 2026** (Japan-Trip startet 25. Mai).
> **Langfrist-Ziel:** v4.0 App Stores + v4.5 Go-to-Market — mission-critical nach Rom-Trip.
> **Source of Truth:** Dieses Dokument. GitHub [Milestones](https://github.com/stekum/roman-holiday-planner/milestones) + [Project Board](https://github.com/users/stekum/projects/1) folgen 1:1.

**Anti-Chaos-Regeln (ab Session 2026-04-19):**
- **Scope-Lock** nach Planung: Keine nachträglichen Items zu laufenden Milestones
- **Max 5 Items pro Milestone** — sonst Split in Teil-Releases
- **Jeder Release hat einen 1-Satz-Zweck** (siehe Überschriften). Items die nicht passen → anderer Release
- ROADMAP.md hat Vorrang; Milestones + Board folgen 1:1

---

## v1.1 — Quick Wins ✅ Released 2026-04-12

| Issue | Titel | Size | Status |
|---|---|---|---|
| #105 | ~~Homebase-Duplikat im KI-Plan~~ | S | ✅ |
| #107 | ~~Entdecken-Filter auf Karte~~ | S | ✅ |
| #59 | ~~AI Review-Zusammenfassungen auf POI-Cards~~ | S | ✅ |
| #118 | ~~Map-Zucken im Reise-Tab~~ | S | ✅ |

**Release:** [`v1.1.0`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.1.0) — 12. Apr 2026

---

## v1.2 — Security + Auth + Bugfixes ✅ Released 2026-04-14

| Issue | Titel | Size | Status |
|---|---|---|---|
| #110 | ~~npm audit fix — Dependency-Vulnerabilities~~ | S | ✅ |
| #111 | ~~Firestore Rules — Workspace-Isolation~~ | M | ✅ (via #112) |
| #112 | ~~Google Sign-In + Admin Approval Workflow~~ | M | ✅ |
| #139 | ~~Microsoft Sign-In (Azure AD / Entra ID)~~ | S | ✅ |
| #106 | ~~Homebase-Foto fehlt~~ | S | ✅ |
| #77 | ~~Seed-POIs entfernen~~ | S | ✅ |
| #5 | ~~Voting / Wunschliste pro POI~~ | M | ✅ |
| #11 | ~~Walking Time zwischen Stops~~ | S | ✅ |
| #27 | ~~Quick-Navigate: Google Maps Deep-Link~~ | S | ✅ |
| #29 | ~~Tagesroute in Google Maps öffnen~~ | S | ✅ |
| #121 | ~~Street View Button auf POI-Card~~ | S | ✅ |
| #115 | **Claude Code Deny Rules + Sandbox** | S | ⏳ offen |
| #116 | **Semgrep Pre-Commit Hook** | S | ⏳ offen |
| #113 | ~~User-Profil (Approval-Teil)~~ → Rest auf v3.0 | M | 🟡 teilweise |
| #115 | ~~Claude Code Deny Rules + Sandbox~~ | S | ✅ |
| #116 | ~~Semgrep Pre-Commit Hook~~ | S | ✅ |
| #152 | ~~ApprovalQueue Bug: nur Pending sichtbar + '?' User~~ | S | ✅ (v1.2.1) |

**Release:** [`v1.2.0`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.2.0) + [`v1.2.1`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.2.1) — 14. Apr 2026

**Status:** v1.2 komplett released inkl. Patch v1.2.1 (User-Management-Fix #152).

---

## v1.5 — AI Features ✅ Released 2026-04-18

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #14 | ~~AI Tages-Briefing (Wetter + Öffnungszeiten + Tipps)~~ | M | ✅ |
| #13 | ~~AI NL POI Search (Freitext → Gemini → Places API)~~ | M | ✅ |
| #23 | ~~AI: Kindgerechte Aktivitäten-Vorschläge~~ | M | ✅ |
| #75 | ~~Generische Kategorien pro Trip~~ | S | ✅ |
| #76 | ~~AI-Prompt Dynamisierung (Stadt/Land aus Trip-Config)~~ | S | ✅ |
| #158 | ~~E2E Test-Auth Scaffolding (Firebase Custom Token → Playwright)~~ | M | ✅ |
| #15 | ~~AI POI Suggestions basierend auf Favoriten~~ | L | ✅ |

**Release:** [`v1.5.0`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.5.0) — 18. Apr 2026

**Status:** v1.5.0 released. Die offenen Nicht-AI-Issues (#123/#133/#137/#154) wurden nach v2.0 verschoben — trip-unkritisch + thematisch besser bei Polish. Die AI-Follow-ups (#16, #43, #169) landen als `v1.5.1` Patch (siehe nächste Sektion). Project Board hat v1.5.1 als eigene Release-Option (ID-Regen 2026-04-18 durchgeführt).

---

## v1.5.1 — AI Briefing Ghost-Mount Fix ✅ Released 2026-04-19

| Issue | Titel | Size | Status |
|---|---|---|---|
| #169 | ~~Bug: AI Tages-Briefing rendert mehrfach + falscher Tag-Content~~ | S | ✅ |
| #16 | Smarter Instagram-Import: extrahiert Ortsnamen aus Captions | L | → v2.0 verschoben |
| #43 | AI: Was wir verpasst haben (Post-Trip-Analyse) | M | → v2.0 verschoben |

**Release:** [`v1.5.1`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.5.1) — 19. Apr 2026. Enthielt primär den #169-Fix (Ghost-Mount-Bug in DayBriefingCard). #16 + #43 nach v2.0 verschoben — beides L-/M-Features die mehr Scope brauchen als ein Patch-Release hergibt.

---

## v2.0 — Pre-Multi-Trip Foundation + AI Follow-ups (Ziel: 26. April 2026)

**Zweck:** CI-Safety-Net aufbauen BEVOR der riskante Multi-Trip-Refactor (#71) startet + nachgezogene AI-Features aus v1.5 die zu gross für v1.5.1-Patch waren.

| Issue | Titel | Size | Est. h |
|---|---|---|---|
| #170 | CI: GitHub Actions Build+Lint auf PR | S | 2 |
| #171 | CI: Auto-Deploy Beta bei main-Merge | M | 5 |
| #16 | Smarter Instagram-Import (Gemini Ortsnamen-Extraktion aus Captions) | L | 8 |
| #43 | AI: Was wir verpasst haben (Post-Trip-Analyse) | M | 5 |

**4 Items, ~20h. 1-1.5 Wochen.**

**Bereits shipped ohne eigenes Release** (Commits 2026-04-14 bis -18): #51 Kommentare · #48 Budget · #38 Besuchsstatus · #34 Currency · #167 Places API (New)

**Aus v2.0 verschoben (siehe jeweilige neue Section unten):**
- #172, #173, #117, #123, #133, #137, #154 → v2.1 (DevOps opportunistisch)
- #73 → v3.0 (Japan-Ready, Multi-Trip-Foundation)
- #122 → v3.2 (Multi-Trip-Polish)
- #46 → v3.1 (Trip-Essentials, post-Japan informiert)
- #132, #140 → Deferred (nicht Familien-kritisch)

**Release:** `v2.0.0` — 26. Apr 2026.

---

## v3.0-beta — Multi-Trip Architektur (Ziel: 10. Mai 2026)

**Zweck:** Architektur von Single-Workspace auf Trip-fähig umstellen. Der kritische Refactor.

| Issue | Titel | Size | Est. h | Prio |
|---|---|---|---|---|
| #71 | Dynamischer workspaceId (Listener-Switch) | L | 15 | **critical** |
| #70 | Trip-Selector UI (Basic: Dropdown im Header) | M | 5 | high |

**2 Items, ~20h. 2 Wochen.**

**Scope-Lock:** #72 Trip-Wizard NICHT hier (Stefan kann manuell via Firestore). Verschoben zu v3.2.

**Safety-Net:** Durch v2.0-CI wird jeder PR automatisch gebaut+gelintet. Refactor läuft nicht „blind".

**Release:** `v3.0.0-beta.1` — 10. Mai 2026. Beta-only, nicht Production.

---

## v3.0 — Japan-Ready (Ziel: 24. Mai 2026)

**Zweck:** Features die Japan-Trip (25.-31. Mai) technisch ermöglichen.

| Issue | Titel | Size | Est. h |
|---|---|---|---|
| #73 | Stadt-Konfiguration (CityConfig statt ROME_CENTER) | M | 6 |
| #74 | Multi-Homebase pro Trip (datumsbasiert) | M | 6 |
| #78 | Transit-Tage (Reisetage zwischen Städten) | M | 6 |
| #113 | Auth: User-Profil + Workspace-Zuordnung (Multi-Trip-Access) | M | 6 |

**4 Items, ~24h. 2 Wochen + Buffer.**

**Japan-Use-Case:** Tokyo/Kyoto/Osaka als 3 Homebases, Shinkansen-Tage als Transit zwischen Cities, POI-Suchen pro Stadt statt Rom-zentriert.

**Scope-Lock:** #79 Archivierung verschoben zu v3.2 (nicht Japan-kritisch bei nur 2 Trips).

**Release:** `v3.0.0` — 24. Mai 2026. **Production-Deploy, 1 Tag vor Japan-Abreise.**

---

## Japan-Trip — Real-World-Test (25.–31. Mai 2026)

Kein neuer Feature-Scope. Patch-Releases (`v3.0.1`, `v3.0.2`) für Bugs die unter realen Bedingungen auftauchen. Erkenntnisse informieren v3.1.

---

## v3.1 — Trip Essentials post-Japan (Ziel: 1. August 2026)

**Zweck:** Reise-Essentials bauen — informiert durch Japan-Erfahrung, nicht aus Blind-Planung.

| Issue | Titel | Size | Herkunft |
|---|---|---|---|
| #46 | Packing List (kategorisiert, pro Person) | M | verschoben aus v2.0 |
| #44 | Notfall-Dashboard | M | aus Deferred |
| #45 | Dokumente-Tresor (Reisepass, Buchungen) | M | aus Buffer |
| #50 | Aktivitäts-Feed (wer hat was geändert) | M | aus Buffer |

**4 Items.** Scope vor Phase-Start ggf. nochmal mit Japan-Learnings angepasst.

**Release:** `v3.1.0` — 1. Aug 2026.

---

## v3.2 — Multi-Trip-Polish vor Rom (Ziel: 30. September 2026)

**Zweck:** Quality-of-Life für etablierte Multi-Trip-Nutzer + Rom-Prep.

| Issue | Titel | Size | Herkunft |
|---|---|---|---|
| #79 | Trip-Archivierung | S | aus v3.0 |
| #72 | Trip-Erstellungs-Wizard | M | aus v3.0-beta |
| #122 | Multi-Language Support (DE + EN + evtl. JP) | L | aus v2.0 |

**3 Items, bis ~25h.**

**Release:** `v3.2.0` — 30. Sep 2026.

---

## Rom-Trip (Herbst 2026)

Zweiter Multi-Trip auf gereifter Architektur. App-Stand: v3.2. Bugs während Rom-Trip → `v3.2.x`-Patches.

---

## v4.0 — App Stores & Native Platforms (Ziel: Q1 2027)

**Zweck:** Aus der PWA eine native iOS/Android-App machen. Voraussetzung für Monetarisierung + breiteren Launch.

**Kern-Umbau:** Capacitor wrapping, Native Plugins, Store-Listings, Push-Notifications, Datenschutz.

| Issue | Titel | Size | Kategorie |
|---|---|---|---|
| #80 | Capacitor Integration (iOS + Android Wrapping) | L | Infra |
| #81 | iOS Build + TestFlight Setup | M | Infra |
| #82 | Android Build + Play Console Setup | M | Infra |
| #83 | Native Plugins: Camera, Share, Geolocation | M | Native |
| #84 | Native Push Notifications | M | Native |
| #85 | Offline-Mode + Background-Sync | L | Native |
| #86 | App-Icon + Splash-Screen (iOS + Android) | S | Assets |
| #87 | In-App-Purchase-Setup (Placeholder für #143) | M | Monetization Prep |
| #88 | App-Store-Review-Prep (Privacy, Screenshots) | M | Launch |
| #89 | Datenschutzerklärung + AGB (Legal für Stores) | M | Legal |
| #114 | Apple Sign-In (Apple-Pflicht für iOS-Release) | M | Auth |
| #155 | Native CarPlay + Android Auto Itinerary Viewer | L | Native |

**Abhängigkeiten:** Apple Developer Account ($99/Jahr), Google Play Developer ($25 einmalig).

**Release:** `v4.0.0` — Q1 2027. Meilenstein vor v4.5 GTM.

---

## v2.1 — DevOps + Ops (opportunistisch, ohne Deadline)

**Zweck:** DevOps-Items die nicht Japan-kritisch sind. Parallel zu v3.x wenn Zeit.

| Issue | Titel | Size |
|---|---|---|
| #172 | CI: Playwright E2E im Pipeline | L |
| #173 | CI: Semantic-Release (auto tag + notes) | M |
| #117 | Hosting-Migration (weg von GitHub Pages) | M |
| #123 | Google Analytics Usage Tracking (Pre-GTM Baseline) | S |
| #133 | Email-Notification bei Zugriffsanfrage | S |
| #137 | Architektur-Dokumentation | M |
| #154 | Docs: CarPlay/Android Auto Handoff | S |

**Release:** `v2.1.x` — flexibel, Stücke als Patches.

---

## v4.5 — Go-to-Market (Post-Trip, nach v4.0)

**Status:** Dormant / Planning. Aktivierung nach Abschluss von v4.0 App Stores (Capacitor, Native Plugins, Store-Deployment).

Bündelt alle Issues rund um Monetarisierung, Marketing und professionellen Launch. Siehe [Umbrella Epic #150](https://github.com/stekum/roman-holiday-planner/issues/150) für den Gesamtüberblick.

| Issue | Titel | Size | Kategorie |
|---|---|---|---|
| #142 | Business Model & Pricing Strategy | L | Monetization |
| #143 | Monetization Tech: IAP + Subscriptions | L | Monetization |
| #148 | Analytics & Unit Economics | M | Monetization |
| #144 | ASO — App Store Optimization | M | Marketing |
| #145 | Marketing Website + SEO | L | Marketing |
| #146 | Launch Campaign Playbook | M | Marketing |
| #147 | Paid Acquisition Strategy | M | Marketing |
| #149 | Legal for Monetization | M | Legal |

**Abhängigkeiten:** #80–#89 (App Stores Infra), #89 (Datenschutzerklärung), #123 (Usage Analytics).

---

## Deferred (kleinere nicht-zeitkritische Items)

| Issue | Titel | Einsatzkontext |
|---|---|---|
| #42 | ~~AI NL-Suche mit Kontext~~ → geschlossen als Duplicate von #13 | — |
| #132 | Auth: GitHub + Email/Password Sign-In | Wenn User ausserhalb Google/Microsoft-Ökosystem kommen |
| #140 | Auth: Facebook Sign-In | Wenn public Launch das erfordert |
| #47 | Expense Tracker | Post-Japan zu bewerten |
| #49 | Familien-Split | Post-Japan zu bewerten |
| #39 | Reise-Statistik | Post-Rom |
| #40 | GPS-Tracking | Post-Rom |
| #20 | Kid-Friendly-Score pro POI | parked 2026-04-20 — nicht sicher ob gewollt |
| #21 | Alters-Filter für POI-Liste | parked 2026-04-20 — pick-up-bei-Langeweile |
| #22 | Pausen-Planer: automatische Downtime-Slots | parked 2026-04-20 — pick-up-bei-Langeweile |
| #24 | Schatzsuche-Modus (Gamification für Kinder) | parked 2026-04-20 — nicht sicher ob gewollt |
| #26 | Familien-Radar: Live-Location aller Mitreisenden | parked — nicht sicher ob gewollt |
| #28 | AR Walking View via Google Maps Live View Deep-Link | parked — nice-to-have, nicht trip-kritisch |
| #35 | Offline Map Tiles (Kartenausschnitt vorab cachen) | parked — nice-to-have, Offline via PWA reicht meist |
| #36 | Offline-Reiseführer: PDF/HTML-Export pro Tag | parked — nice-to-have |
| #37 | Foto-Tagebuch: Bilder pro POI hochladen | parked — nach Japan/Rom zu bewerten |

**Nicht mehr hier gelistet** (haben jetzt eigene Section, siehe oben):
- #16, #43, #169 → v1.5.1 (AI Follow-ups Patch)
- #44 Notfall · #45 Docs-Tresor · #46 Packing · #50 Activity-Feed → v3.1
- #80–#89, #114, #155 → v4.0 (App Stores & Native)
- #142–#150 → v4.5 (Go-to-Market)

---

## Risiken

| Risiko | Impact | Mitigation |
|---|---|---|
| **#71 (L) slippt → v3.0-beta spät** | v3.0 nicht rechtzeitig für Japan | v2.0-CI früh fertig → fokussiertes Arbeiten. Fallback: #71 mit hardcoded-fallback, Trip-Selector minimal |
| **v3.0 slippt → Japan ohne Multi-Trip** | Japan mit Single-Workspace-Workaround | Plan B: einzelner Tokyo-Workspace mit #73 + #74 als Single-Trip-Clone |
| **#169 (Multi-Mount-Bug) bleibt open** | AI-Briefing unbenutzbar während Japan | Time-boxed Fix-Attempt. Notfalls Feature bis nach Japan deaktivieren |
| **CI #170/#171 braucht länger** | v2.0 slippt → v3.0-beta verschoben | S+M-size, realistisch in 1 Woche |
| Firebase Security Rules bei Multi-Trip | Datenleck zwischen Trips | Rules Review vor v3.0-beta Beta-Deploy |
| Google Places API Quota bei Multi-Trip | Mehr POI-Suchen als vorher | Rate-Limit + Caching vorhanden, für Japan nochmal validieren |
| v4.0 App Store Review Delays | Native Launch verzögert | 4-6 Wochen Puffer nach v4.0-Submit |
| v4.5 GTM startet ohne Datenbasis | Pricing/Marketing-Hypothesen nicht evidence-based | #123 Analytics aus v2.1 sammelt 6+ Monate Baseline bis v4.5 aktiv |
