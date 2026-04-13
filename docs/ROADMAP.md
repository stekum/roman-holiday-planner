# Roadmap — 6-Wochen-Plan (Apr 14 – Mai 23, 2026)

> **Ziel:** v3.0 Multi-Trip bis Mitte Mai fertig.  
> **Releases:** Wöchentlich, jeweils Freitag.  
> **Source of Truth:** [GitHub Project Board](https://github.com/users/stekum/projects/1) + [Milestones](https://github.com/stekum/roman-holiday-planner/milestones)

---

## Woche 1 — v1.1 ✅ Released (18. Apr)

| Issue | Titel | Size | Status |
|---|---|---|---|
| #105 | ~~Homebase-Duplikat im KI-Plan~~ | S | ✅ |
| #107 | ~~Entdecken-Filter auf Karte~~ | S | ✅ |
| #59 | ~~AI Review-Zusammenfassungen auf POI-Cards~~ | S | ✅ |
| #118 | ~~Map-Zucken im Reise-Tab~~ | S | ✅ |

**Release:** [`v1.1.0`](https://github.com/stekum/roman-holiday-planner/releases/tag/v1.1.0)

---

## Woche 2 — v1.2 Security + Auth + Bugfixes (21.–25. Apr)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #106 | Homebase-Foto fehlt | S | low |
| #77 | Seed-POIs entfernen (leerer Trip = leere Liste) | S | — |
| #110 | **npm audit fix — Dependency-Vulnerabilities** | S | **high** |
| #111 | **Firestore Rules — Workspace-Isolation** | M | **high** |
| #115 | **Claude Code Deny Rules + Sandbox** | S | **high** |
| #116 | **Semgrep Pre-Commit Hook** | S | **high** |
| #112 | **Google Sign-In (Firebase Auth)** | M | **high** |
| #113 | **User-Profil + Workspace-Zuordnung** | M | — |

**Fokus:** Security-Hardening + Google Auth + restliche Bugs.  
**Release:** `v1.2.0`

---

## Woche 2 — v1.5 AI Features (23.–25. Apr)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #14 | AI Tages-Briefing (Wetter + Öffnungszeiten + Tipps) | M | high |
| #42 | AI NL-Suche mit Kontext (Homebase, Kinder, Besuche) | M | — |
| #75 | Generische Kategorien pro Trip | S | — |
| #76 | AI-Prompt Dynamisierung (Stadt/Land aus Trip-Config) | S | — |
| #121 | **Street View Button auf POI-Card** | S | — |
| #123 | **Google Analytics Usage Tracking** | S | — |

**Fokus:** AI-Features abrunden + Kategorie-System auf Multi-Trip vorbereiten.  
**Release:** `v1.5.0`

---

## Woche 3 — v2.0 Travel Essentials (28. Apr – 2. Mai)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #51 | Kommentare / Notizen pro POI | S | — |
| #48 | Budget pro Tag mit Restbudget-Anzeige | S | — |
| #46 | Packing List (kategorisiert, pro Person) | M | — |
| #73 | Stadt-Konfiguration (CityConfig statt ROME_CENTER) | M | — |
| #117 | **Hosting-Migration (weg von GitHub Pages)** | M | — |
| #122 | **Multi-Language Support (DE + EN)** | L | — |

**Fokus:** Reise-Features für den praktischen Einsatz + Multi-Trip Infra beginnen.  
**Release:** `v2.0.0`

---

## Woche 4 — v3.0-beta Multi-Trip Core (5.–9. Mai)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #71 | Dynamischer workspaceId (Listener-Switch) | L | **critical** |
| #70 | Trip-Selector UI (Dropdown/Modal beim App-Start) | M | high |
| #72 | Trip-Erstellung Wizard | M | high |

**Fokus:** Technisches Fundament für Multi-Trip. #71 ist der kritische Pfad.  
**Release:** `v3.0.0-beta.1` (Beta-only, nicht Production)

---

## Woche 5 — v3.0 Multi-Trip Complete (12.–16. Mai)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| #74 | Mehrere Homebases pro Trip (datums-basiert) | M | high |
| #78 | Transit-Tage (Reisetage zwischen Städten) | M | — |
| #79 | Trip-Archivierung (erledigte Trips ausblenden) | S | — |

**Fokus:** Multi-Trip Feature-Complete. Intensives Testen.  
**Release:** `v3.0.0` → **Production-Deploy Freitag 16. Mai**

---

## Woche 6 — Buffer + Polish (19.–23. Mai)

| Issue | Titel | Size | Prio |
|---|---|---|---|
| — | Slipped Items aus Woche 4/5 | — | high |
| #45 | Dokumente-Tresor (Reisepass, Buchungen) | M | — |
| #50 | Aktivitäts-Feed (wer hat was geändert) | M | — |

**Fokus:** Buffer für verschobene Multi-Trip Items. Wenn v3.0 steht → Polish-Features.  
**Release:** `v3.0.1` oder `v3.1.0`

---

## Deferred (nach der Reise)

| Issue | Titel | Milestone |
|---|---|---|
| #13 | NL POI Search via Claude | v1.5 |
| #15 | AI POI Suggestions | v1.5 |
| #16 | Smarter Instagram-Import | v1.5 |
| #23 | Kindgerechte Aktivitäten (AI) | v1.5 |
| #43 | AI: Was wir verpasst haben | v1.5 |
| #47 | Expense Tracker | v2.0 |
| #49 | Familien-Split | v2.0 |
| #114 | Weitere Social Providers (Microsoft, GitHub, Apple) | v2.0 |
| #44 | Notfall-Dashboard | v2.0 |
| #39 | Reise-Statistik | v2.0 |
| #40 | GPS-Tracking | v2.0 |
| #80–#89 | App Stores (Capacitor) | v4.0 |

---

## Risiken

| Risiko | Impact | Mitigation |
|---|---|---|
| #71 (dynamischer workspaceId) dauert länger als geplant | v3.0 verzögert sich | Woche 6 als Buffer; notfalls #78 + #79 nach v3.0.1 verschieben |
| Google Places API Quota-Limits bei AI-Features | AI-Suche funktioniert nicht zuverlässig | Rate-Limiting + Caching implementieren |
| Firebase Security Rules bei Multi-Workspace | Datenleck zwischen Workspaces | Security Rules vor v3.0-beta Review mit Stefan |
