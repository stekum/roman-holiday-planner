# Multi-Trip Validation Test-Plan (Living Doc)

**Master-Tracker:** [#238](https://github.com/stekum/roman-holiday-planner/issues/238)
**Setup:** `node scripts/setup-multi-trip-test-workspace.mjs` legt einen
deterministischen Workspace `multi-trip-smoke-test` mit 3 Homebases
(Tokyo/Kyoto/Osaka mit Datums-Ranges 25.-31. Mai 2026) an.

**Workspace bypass:** `localStorage.setItem('rhp:active-workspace', 'multi-trip-smoke-test'); location.reload();`

**Status-Legende:** ✅ passed · ❌ failed · ⏳ open · 🚧 blocked · 🔁 needs-retest

---

## TC-1: Trip-Switch + Map-Center-Update

**Setup:** App auf Beta, e2e-user oder Stefan-Account.

| Step | Action | Erwartet |
|---|---|---|
| 1 | Trip-Switcher → wechsle auf `multi-trip-smoke-test` | Map zentriert auf Tokyo (Trip-Center) |
| 2 | Reise-Tab öffnen, Tag 1 (25. Mai) | Map auf Park Hyatt Tokyo |
| 3 | Tag 4 (28. Mai) klicken | Map pannt auf Westin Miyako Kyoto |
| 4 | Tag 6 (30. Mai) klicken | Map pannt auf Hotel Granvia Osaka |
| 5 | Trip-Switcher → zurück auf `default` (Rom) | Map zentriert auf Trastevere |

**Status:** ✅ passed (verifiziert 2026-04-25 via `e2e/multi-trip-comprehensive.e2e.js`, Screenshots in `.playwright-results/multi-trip-*.png`)

---

## TC-2: Multi-Homebase-Marker auf Karte

**Setup:** wie TC-1, Reise-Tab, Tag 1 (Tokyo aktiv).

| Step | Action | Erwartet |
|---|---|---|
| 1 | Karte rauszoomen bis Honshu sichtbar | 3 Homebase-Marker zu sehen: 1 großer schwarzer (Tokyo, aktiv), 2 kleine halbtransparente (Kyoto, Osaka) |
| 2 | Tag 4 (Kyoto) | Kyoto-Marker wird groß+schwarz, Tokyo wird klein+transparent |
| 3 | Tag 6 (Osaka) | Osaka-Marker wird groß+schwarz |

**Status:** ✅ passed (Multi-Marker via #234 implementiert)

---

## TC-3: AI-Tagesplan — Quick-Tags reflektieren TripConfig

**Setup:** Reise-Tab, Tag 7 (Osaka), "AI Tagesplan"-Button.

| Step | Action | Erwartet |
|---|---|---|
| 1 | Modal öffnet | Quick-Tags zeigen `tripConfig.categories` (Sushi, Ramen, Tempel, …) — NICHT Pizza/Gelato/Trattoria/Aperitivo |
| 2 | Switche zu Rom-Trip → "AI Tagesplan" | Quick-Tags zeigen Rom-Defaults |

**Status:** ❌ FAILED — siehe **#239**. Quick-Tags hardcoded auf Rom in `AiDayPlannerModal.tsx:24-33`.

---

## TC-4: AI-Tagesplan — Stops in der richtigen Stadt

**Setup:** Reise-Tab, Tag 7 (30. Mai = Osaka Range).

| Step | Action | Erwartet |
|---|---|---|
| 1 | "AI Tagesplan" → Eingabe "explore region close to hotel" → Generieren | Alle generierten Stops liegen in/um **Osaka** (Hotel Granvia ist in Umeda, Stops im Umkreis 30km) |
| 2 | Verifiziere Karte | Alle 6 Marker im Osaka-Bereich (nicht Tokyo) |
| 3 | Wiederhole für Tag 4 (Kyoto) | Stops in Kyoto |
| 4 | Wiederhole für Tag 1 (Tokyo) | Stops in Tokyo |

**Status:** ❌ FAILED — siehe **#240**. Tag 7 Osaka liefert Tokyo-POIs (Shinjuku Gyoen, Isetan, Tokyo Metropolitan Government Building). Bias / Prompt-City falsch.

---

## TC-5: AI-Briefing per Tag

**Setup:** Tag 4 (Kyoto), Tagesplan mit min. 2 Stops vorhanden.

| Step | Action | Erwartet |
|---|---|---|
| 1 | "Briefing erzeugen"-Button | Briefing-Text nennt Kyoto / Westin Miyako / Kyoto-Sehenswürdigkeiten — NICHT Tokyo / Park Hyatt |

**Status:** ⏳ open (nach Fix #240 retesten — sollte korrekt sein, weil App.tsx bereits `getHomebaseForDay(homebases, dayIso)` an `generateDayBriefing` weiterleitet)

---

## TC-6: Vibes-Suche — Tokyo-Tag liefert Tokyo-Treffer

**Setup:** Tag 1 (Tokyo) aktiv. FAB → Vibes-Suche.

| Step | Action | Erwartet |
|---|---|---|
| 1 | Eingabe: "nice food close to hotel" | Treffer in Tokyo (Shinjuku/Roppongi-Nähe) |
| 2 | Wechsle zu Tag 4 (Kyoto), wieder Vibes-Suche | Treffer in Kyoto |

**Status:** ⏳ open (verwandt mit #240 — gleicher Bias-Mechanismus, möglicherweise gleicher Bug)

---

## TC-7: Place-Suche (FAB → Suchen) reagiert auf aktive Homebase

**Setup:** wie TC-6.

| Step | Action | Erwartet |
|---|---|---|
| 1 | Tag 1 (Tokyo): "Sushi" suchen | Tokyo-Sushi-Restaurants (geprüft am 24.04, funktionierte) |
| 2 | Tag 6 (Osaka): "Sushi" suchen | Osaka-Sushi-Restaurants |
| 3 | Switch auf Rom-Trip: "Sushi" suchen | Rom-Sushi (nicht Tokyo!) |

**Status:** ⏳ open

---

## TC-8: Cross-Device Workspace-Sync

**Status:** ✅ passed (verifiziert via #113 Phase 1, Stefan 2026-04-24)

---

## TC-9: Forget Trip / Re-Open

**Setup:** Trip-Switcher → Trash-Icon auf einem Trip.

| Step | Action | Erwartet |
|---|---|---|
| 1 | Trip aus Liste entfernen | Verschwindet aus Dropdown, Firestore-Doc bleibt |
| 2 | Reload | Trip ist beim Sync wieder da (additiv-only, Phase 1 Limitation) |

**Status:** ✅ passed (gewollt, dokumentiert; harter Delete kommt mit #228 Phase 2)

---

## TC-10: PWA Cache (#236)

**Status:** ✅ passed (selfDestroying SW deployed 2026-04-25)

---

## Wartet auf Multi-User (#228)

- TC-N: Mehrere User auf demselben Trip gleichzeitig
- TC-N+1: Owner kann Mitglieder einladen
- TC-N+2: Member sieht Trip nach Login automatisch

→ Eigenes Ticket #228, separater Validation-Sweep.

---

## Setup / Cleanup

```bash
# Setup:
node scripts/setup-multi-trip-test-workspace.mjs

# Smoke (automated):
node e2e/multi-trip-comprehensive.e2e.js

# Cleanup (Firestore via admin SDK):
node -e "import('firebase-admin').then(({default: a}) => {
  a.initializeApp({credential: a.credential.cert(require('./service-account.json'))});
  return a.firestore().doc('workspaces/multi-trip-smoke-test').delete();
}).then(()=>console.log('deleted'))"
```
