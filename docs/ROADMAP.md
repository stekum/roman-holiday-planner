# Roadmap — 6-Wochen-Plan (Apr 14 – Mai 23, 2026)

> **Ziel:** v3.0 Multi-Trip bis Mitte Mai fertig.  
> **Releases:** Wöchentlich, jeweils Freitag.  
> **Source of Truth:** [GitHub Project Board](https://github.com/users/stekum/projects/1) + [Milestones](https://github.com/stekum/roman-holiday-planner/milestones)

---

## v1.1 — Quick Wins ✅ Released 2026-04-12

| Issue | Titel | Size | Status |
|---|---|---|---|
| #105 | ~~Homebase-Duplikat im KI-Plan~~ | S | ✅ |
| #107 | ~~Entdecken-Filter auf Karte~~ | S | ✅ |
| #59 | ~~AI Review-Zusammenfassungen auf POI-Cards~~ | S | ✅ |
| #118 | ~~Map-Zucken im Reise-Tab~~ | S | ✅ |

**Release:** [`v1.1.0`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.1.0)

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

**Status:** v1.2 komplett released als `v1.2.0` (14. Apr) + Patch `v1.2.1` (14. Apr, User-Management-Fix).

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

**Status:** v1.5.0 released. Die offenen Nicht-AI-Issues (#123/#133/#137/#154) wurden nach v2.0 verschoben — trip-unkritisch + thematisch besser bei Polish. Die AI-Follow-ups (#16, #43, #169) landen als `v1.5.1` Patch (siehe nächste Sektion). Project Board hat v1.5.1 als eigene Release-Option (ID-Regen 2026-04-18 durchgeführt).

---

## v1.5.1 — AI Follow-ups (Patch, TBD)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #16 | Smarter Instagram-Import: extrahiert Ortsnamen aus Captions | M | — |
| #43 | AI: Was wir verpasst haben (Post-Trip-Analyse) | M | — |
| #169 | Bug: AI Tages-Briefing rendert mehrfach + falscher Tag-Content | S | — |

**Fokus:** Nachgezogene AI-Features aus v1.5 + Bugfix. Kleines Patch-Release ohne Deadline — wird eingeplant wenn zwischen v2.0-Features Zeit ist.

---

## v2.0 — Travel Essentials + Polish (Ziel: 2. Mai 2026)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #51 | ~~Kommentare / Notizen pro POI~~ | S | ✅ |
| #48 | ~~Budget pro Tag mit Restbudget-Anzeige~~ | S | ✅ |
| #38 | ~~Besuchsstatus pro POI (✅ Besucht / ⏭️ Übersprungen)~~ | S | ✅ |
| #34 | ~~Lokale Währung auf POI-Cards (price_level MVP)~~ | S | ✅ |
| #46 | Packing List (kategorisiert, pro Person) | M | — |
| #73 | Stadt-Konfiguration (CityConfig statt ROME_CENTER) | M | — |
| #117 | Hosting-Migration (weg von GitHub Pages) | M | — |
| #122 | Multi-Language Support (DE + EN) | L | — |
| #140 | Facebook Sign-In | M | — |
| #132 | GitHub + Email/Password Sign-In | M | — |
| #123 | Google Analytics Usage Tracking (aus v1.5 verschoben) | S | — |
| #133 | Email-Notification an Admin bei neuer Zugriffsanfrage (aus v1.5) | S | — |
| #137 | Architektur-Dokumentation aufsetzen (aus v1.5) | M | — |
| #154 | Docs: CarPlay/Android Auto Handoff via Deep-Links (aus v1.5) | S | — |
| #167 | ~~Places API (New): priceRange + Cuisine-Tags (Upgrade von #34)~~ | M | ✅ |

**Fokus:** Reise-Features für den praktischen Einsatz + Multi-Trip Infra beginnen + Auth-Provider-Komplettierung.  
**Release:** `v2.0.0`

---

## v3.0-beta — Multi-Trip Core (Ziel: 9. Mai 2026)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #71 | Dynamischer workspaceId (Listener-Switch) | L | **critical** |
| #70 | Trip-Selector UI (Dropdown/Modal beim App-Start) | M | high |
| #72 | Trip-Erstellung Wizard | M | high |

**Fokus:** Technisches Fundament für Multi-Trip. #71 ist der kritische Pfad.  
**Release:** `v3.0.0-beta.1` (Beta-only, nicht Production)

---

## v3.0 — Multi-Trip Complete (Ziel: 16. Mai 2026)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #74 | Mehrere Homebases pro Trip (datums-basiert) | M | high |
| #78 | Transit-Tage (Reisetage zwischen Städten) | M | — |
| #79 | Trip-Archivierung (erledigte Trips ausblenden) | S | — |

**Fokus:** Multi-Trip Feature-Complete. Intensives Testen.  
**Release:** `v3.0.0` → **Production-Deploy Freitag 16. Mai**

---

## Buffer + Polish (19.–23. Mai, reserved)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| — | Slipped Items aus Woche 4/5 | — | high |
| #45 | Dokumente-Tresor (Reisepass, Buchungen) | M | — |
| #50 | Aktivitäts-Feed (wer hat was geändert) | M | — |

**Fokus:** Buffer für verschobene Multi-Trip Items. Wenn v3.0 steht → Polish-Features.  
**Release:** `v3.0.1` oder `v3.1.0`

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

## Deferred (nach der Reise)

| Issue | Titel | Milestone |
|---|---|---|
| #42 | ~~AI NL-Suche mit Kontext~~ → **Kontext-Erweiterung, geschlossen als Duplicate von #13** | — |
| #16 | Smarter Instagram-Import | v1.5 |
| #43 | AI: Was wir verpasst haben (Post-Trip) | v1.5 |
| #47 | Expense Tracker | v2.0 |
| #49 | Familien-Split | v2.0 |
| #132 | Auth: GitHub + Email/Password Sign-In | v2.0 |
| #140 | Auth: Facebook Sign-In | v2.0 |
| #44 | Notfall-Dashboard | v2.0 |
| #39 | Reise-Statistik | v2.0 |
| #40 | GPS-Tracking | v2.0 |
| #114 | Apple Sign-In (braucht Apple Developer Account $99/Jahr) | v4.0 |
| #80–#89 | App Stores (Capacitor) | v4.0 |
| #155 | Native CarPlay + Android Auto Itinerary Viewer (depends on Capacitor + CarPlay Entitlement) | v4.0 |
| #142-#150 | Go-to-Market (Pricing, Marketing, Launch) | v4.5 |

---

## Risiken

| Risiko | Impact | Mitigation |
|---|---|---|
| #71 (dynamischer workspaceId) dauert länger als geplant | v3.0 verzögert sich | Woche 6 als Buffer; notfalls #78 + #79 nach v3.0.1 verschieben |
| Google Places API Quota-Limits bei AI-Features | AI-Suche funktioniert nicht zuverlässig | Rate-Limiting + Caching implementieren |
| Firebase Security Rules bei Multi-Workspace | Datenleck zwischen Workspaces | Security Rules vor v3.0-beta Review mit Stefan |
