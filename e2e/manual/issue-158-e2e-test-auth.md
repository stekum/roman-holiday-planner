# Test: #158 — E2E Test-Auth Scaffolding

**Testen auf:** Beta (https://stekum.github.io/roman-holiday-planner/beta/) nach Deploy dieses PRs

**Vorbedingungen**
- Feature-Branch gemerged, `deploy:beta` gelaufen
- Service-Account-JSON aus Firebase Console heruntergeladen:
  - Firebase Console → Project Settings → Service Accounts → **Generate new private key**
  - Entweder nach `./service-account.json` im Projekt-Root (gitignored)
  - Oder `GOOGLE_APPLICATION_CREDENTIALS=/pfad/zu/key.json` im Env

---

## TC-1: Token-Minting funktioniert (bootstrapping)

1. Im Projekt-Root: `npm run e2e:token`

**Erwartetes Ergebnis:**
- ✅ Beim ersten Lauf: Logs `[mint-e2e-token] creating auth user e2e-test-user-1` + `[mint-e2e-token] creating firestore profile e2e-test-user-1`
- ✅ Token-String (ca. 1000+ Zeichen) wird auf stdout geschrieben
- ✅ Datei `.playwright-results/e2e-token.txt` existiert
- ✅ Exit-Code 0

**Negativ-Check:** Ohne Service Account → klare Fehlermeldung mit Setup-Anleitung.

---

## TC-2: Test-User existiert in Firebase

1. TC-1 ausgeführt
2. Firebase Console → Authentication → Users

**Erwartetes Ergebnis:**
- ✅ User mit UID `e2e-test-user-1`, Email `e2e@roman-holidays.test`, Display Name `E2E Test User` ist sichtbar

3. Firestore Console → Collection `users` → Doc `e2e-test-user-1`

**Erwartetes Ergebnis:**
- ✅ Felder: `status: 'approved'`, `email`, `displayName`, `__e2eTestUser: true`

---

## TC-3: Idempotenz — Mehrmals minten

1. `npm run e2e:token` ein zweites Mal ausführen

**Erwartetes Ergebnis:**
- ✅ Kein erneutes Create-Log (User existiert schon)
- ✅ Frischer Token auf stdout
- ✅ `.playwright-results/e2e-token.txt` überschrieben

---

## TC-4: Playwright Auto-Login auf Beta

1. Token liegt in `.playwright-results/e2e-token.txt` (frisch, ≤1h alt)
2. `npm run e2e:issue-13`

**Erwartetes Ergebnis:**
- ✅ Browser lädt Beta-URL
- ✅ App rendert die authenticated View (FAB ist sichtbar) — KEIN LoginScreen
- ✅ Smoke-Test-Flow läuft durch: Menu → Vibes-Suche → Query → Finden → Ergebnisse
- ✅ Screenshots in `.playwright-results/issue-13-*.png` (6 Dateien)
- ✅ Letzte Log-Zeile: `✅ SMOKE TEST PASSED`

---

## TC-5: Token-Ablauf nach 1h

1. `npm run e2e:token` ausführen
2. 1+ Stunde warten (oder Token künstlich invalidieren)
3. `npm run e2e:issue-13` ausführen

**Erwartetes Ergebnis:**
- ✅ Playwright startet, App lädt Beta
- ✅ Firebase loggt `auth/invalid-custom-token` oder ähnlich
- ✅ App bleibt auf LoginScreen (kein Login passiert)
- ✅ Test schlägt beim FAB-waitForSelector fehl mit Timeout — eindeutig zu diagnostizieren

_(Nicht kritisch — einfach frischen Token minten.)_

---

## TC-6: Service Account nicht committed

1. `git status` + `git log --stat` prüfen

**Erwartetes Ergebnis:**
- ✅ `service-account.json` oder ähnliche Dateien NICHT in git history
- ✅ `.gitignore` enthält die Patterns `service-account*.json` + `*-credentials.json`

---

## TC-7: E2E-Auth-Bypass nur via sessionStorage

1. Beta-URL öffnen ohne `sessionStorage.setItem('rhp:e2e-token', ...)` vorher
2. Via DevTools: `sessionStorage.getItem('rhp:e2e-token')` → sollte null sein

**Erwartetes Ergebnis:**
- ✅ App zeigt LoginScreen wie für normale User
- ✅ Kein Auto-Login via URL-Param, kein Side-Channel
- ✅ Nur via Playwright `addInitScript` (vor Navigation) geht Bypass

---

## TC-8: AGENTS.md-Referenz

1. `AGENTS.md` → Abschnitt "size:M — Standard" → Punkt 5 "Playwright-Smoke"

**Erwartetes Ergebnis:**
- ✅ Schritte für Setup + Nutzung dokumentiert
- ✅ Kein "BLOCKIERT"-Hinweis mehr
- ✅ Klar: auf Beta, nicht localhost
