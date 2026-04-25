# Test: Workspace Access Control + Einladungs-Flow (#228)

**Testen auf:** Beta (https://holiday-planner-beta.web.app/) → nach Stefan-Validierung Prod

**Voraussetzung:**
- Stefan eingeloggt mit `stefan.kummert@gmail.com` (Admin)
- Optional: zweiter Browser/Inkognito-Tab für Recipient-Tests, wenn nicht via Sandra/Johanna real testbar
- Cloud Functions deployed: `firebase deploy --only functions,firestore:rules --project roman-holiday-planner-6ac48`

**Automatisierte Coverage:**
- Single-User-Smoke: `node e2e/issue-228-workspace-access-control.e2e.js` (5 Steps)
- Full-Coverage-Smoke: `node e2e/issue-228-full-coverage.e2e.js` (15 Steps inkl. Recipient + Mirror + Negative + Lifecycle)

Manuelle Tests unten decken **was die Automatisierung nicht prüfen kann**: visuelle Korrektheit, echter OAuth-Login, Mobile-Layout, Real-User-Friction.

---

## TC-1: Auto-Create eines neuen Workspaces setzt Owner

1. Trip-Switcher öffnen → „Neuen Trip anlegen" → ID „test-228-`<beliebig>`" + Anzeigename
2. App lädt in den neuen Trip
3. Settings-Tab öffnen → Sektion „Mitglieder"
4. **Erwartung:** Genau ein Eintrag — der eigene User mit Crown-Badge „Owner" und Pille „Du"
5. **Erwartung:** Button „Einladungs-Link erstellen" sichtbar (Owner-only)
6. **Erwartung:** Sektion „Owner-Bereich" mit „Trip löschen"-Button sichtbar (Owner-only)

## TC-2: Einladungs-Link generieren + kopieren

1. Im aus TC-1 erstellten Trip: Settings → Mitglieder → „Einladungs-Link erstellen" klicken
2. **Erwartung:** Inline-Block erscheint mit:
   - Hinweis-Text mit Ablaufdatum (heute + 7 Tage)
   - Read-only-Input mit URL `https://holiday-planner.../?invite=<32 chars>`
   - Buttons „Kopieren" + „✕"
3. „Kopieren" klicken → Button wechselt zu „Kopiert ✓" für ~1.5s
4. **Erwartung:** Inhalt der Zwischenablage = die generierte URL
5. „✕" klicken → Inline-Block verschwindet, „Einladungs-Link erstellen"-Button wieder da

## TC-3: Recipient öffnet Einladungs-Link (anderer Account)

**Setup:** Im zweiten Browser/Inkognito mit zweitem Google-Account einloggen (z.B. Sandra/Johanna).

1. Den aus TC-2 kopierten Link in der Adressleiste öffnen
2. **Erwartung:** Akzeptier-Modal kommt mit:
   - Titel „Trip-Einladung"
   - Text „<Stefan> hat dich zu <test-228-…> eingeladen"
   - „Gültig bis <Datum>"-Hint
   - Hinweis „In den Einstellungen kannst du wählen, zu welcher Familie du gehörst"
   - Buttons „Beitreten" + „Später"
3. „Beitreten" klicken
4. **Erwartung:** Modal verschwindet, App lädt automatisch in den eingeladenen Trip (Trip-Switcher zeigt den neuen Trip-Namen)
5. **Erwartung:** URL hat `?invite=` Parameter nicht mehr drin
6. Settings → Mitglieder → **Erwartung:** Beide Accounts sichtbar, Stefan mit Owner-Badge, der Recipient ohne (Members-Liste nur read-only sichtbar für Non-Owner)

## TC-4: Family-Wahl nach Beitritt

1. Im Anschluss an TC-3 als Recipient: Settings → „Meine Familie" Sektion
2. **Erwartung:** Family-Dropdown zeigt die Families des neuen Trips
3. Eine Family wählen
4. Settings → Mitglieder → **Erwartung:** Member-Eintrag bleibt unverändert (Family-Wahl ist orthogonal zu Membership)

## TC-5: Negativ — gleicher Token zweimal eingelöst

1. Den Link aus TC-2 nochmal öffnen (mit beliebigem Account)
2. **Erwartung:** Modal zeigt Fehler „Diese Einladung wurde bereits eingelöst" + „Schließen"-Button
3. Schließen → URL ist sauber, App im normalen Zustand

## TC-6: Negativ — Token in URL ist Müll

1. URL `https://holiday-planner-beta.web.app/?invite=hunbarpunbarpunbarpunbarpunbar32` öffnen (32 chars `[a-z0-9]`, aber kein echter Token)
2. **Erwartung:** Modal zeigt „Einladung wurde nicht gefunden oder ist abgelaufen"
3. URL `https://holiday-planner-beta.web.app/?invite=zu_kurz` öffnen (Token-Format-Verletzung)
4. **Erwartung:** Kein Modal — Token wird clientseitig ignoriert (Regex-Check in `readInviteFromURL`)

## TC-7: Owner entfernt einen Member

1. Als Owner: Settings → Mitglieder → bei einem Member-Eintrag (Hover) das `UserMinus`-Icon klicken
2. Bestätigungs-Dialog → OK
3. **Erwartung:** Member verschwindet aus der Liste
4. **Erwartung (nach ~5s, Cloud-Function-Mirror-Latenz):** Im Browser des entfernten Members zeigt der Trip-Switcher den Trip nicht mehr in der Liste (nach Reload)

## TC-8: Owner-Übergabe

1. Als Owner: Settings → Mitglieder → bei einem Member das `Crown`-Icon klicken
2. Bestätigungs-Dialog mit Member-Name → OK
3. **Erwartung:** Crown-Badge wechselt zum neuen Owner
4. **Erwartung:** Eigene Action-Buttons (Crown, UserMinus, Share-Link, Trip-Löschen) verschwinden — du bist nur noch Member
5. Beim neuen Owner (anderer Browser, nach Reload): die Buttons erscheinen jetzt bei ihm

## TC-9: Trip löschen kaskadiert POIs

1. Als Owner eines Test-Trips mit ≥1 POI: Settings → „Owner-Bereich" → „Trip löschen" klicken
2. Bestätigungs-Dialog → OK
3. **Erwartung:** Page-Reload, Trip-Switcher zeigt den gelöschten Trip nicht mehr
4. **Verifikation via Audit-Script** (optional): `node scripts/audit-firestore.mjs | grep <trip-id>` → kein Match

## TC-10: Mobile-Smoke (iPhone, Mobile-Safari)

1. Auf dem iPhone Beta öffnen, einloggen
2. Settings öffnen → Mitglieder-Sektion sichtbar?
3. Share-Link-Button klicken → Inline-Block bricht NICHT die Layout-Breite (kein horizontales Scrollen)
4. Modal von Empfänger-Flow (TC-3) → zentriert, Buttons groß genug für Touch (mind. 44px)

---

## Bekannte Limitationen

- **Read-on-non-existent-doc Rules-Bypass:** Wenn ein User mit `status=approved` einen Workspace per URL hardcoded öffnet, der noch nicht existiert (z.B. `?...&workspace=geheim`), wird der Read von der Rule erlaubt (`!exists()` Branch). Das ist BEABSICHTIGT — sonst kann der Auto-Create-Listener nicht funktionieren. Sobald das Doc geschrieben ist (durch wen auch immer hat es geschrieben — der wird Owner), gilt der normale `isMember`-Check.
- **Mirror-Latenz:** `users.{uid}.workspaceIds` updates kommen via Cloud Function (eventually consistent, typisch 2-5s). Trip-Switcher zeigt frisch-gejointe Trips erst nach diesem Delay an oder nach manuellem Reload.
- **Family-Wahl im Recipient-Flow:** Bewusst NICHT im Akzeptier-Modal — Family-Wahl in `Settings → Meine Familie` (siehe Design-Doc).
