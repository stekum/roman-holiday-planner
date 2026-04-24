# Manual Test: #113 Phase 1 — Cross-Device Workspace-Sync

**Ziel:** Die Liste bekannter Trips (TripSwitcher-Dropdown) wird server-side pro User gespeichert (`users/{uid}.workspaceIds`) und auf jedem Device beim Login gemerged. Stefan's beobachtetes Problem vom 2026-04-24: Japan-Trip in Browser A erstellt, Browser B zeigte nur `default`.

**Test-Umgebung:** Beta (`https://holiday-planner-beta.web.app/`) nach Deploy.

**Vorbedingungen:**
- Zwei Browser / Inkognito-Fenster mit demselben Google-Account
- Oder ein Browser + ein anderes Gerät (Phone)

---

## TC-1: Neuer Trip propagiert auf Device B

1. Browser A: Login → TripSwitcher → "+ Neuen Trip anlegen" → `sync-test-a` / "Sync Test A" → Anlegen.
2. Firestore-Console prüfen: `users/{uid}.workspaceIds` enthält `default` + `sync-test-a`.
3. Browser B (frischer localStorage): Login mit **selben Account**.
4. TripSwitcher öffnen → **beide Einträge** sichtbar: `default` (aktiv) + `sync-test-a`.

**Erwartet:** Ohne manuelles Anlegen erscheint der in Browser A erstellte Trip auch in Browser B.

### TC-1a: Edge Case — Trip-Name-Unterschied
Der Display-Name "Sync Test A" aus Browser A erscheint NICHT in Browser B — dort wird nur die rohe ID `sync-test-a` angezeigt. Das ist **gewollt** für Phase 1: Display-Namen bleiben device-local. User kann ihn in Browser B via Pencil-Icon eigen setzen.

## TC-2: Auto-Tracking beim Trip-Öffnen

1. Fresh Browser C, noch nie eingeloggt, oder localStorage `rhp:*` gelöscht.
2. Vor Login Firestore-Console: `users/{uid}.workspaceIds` existiert nicht oder ist leer.
3. Login auf Browser C.
4. App öffnet Default-Workspace.
5. Firestore: `workspaceIds` hat jetzt mindestens `default` (der aktive Workspace wurde automatisch angehängt).

**Erwartet:** `useWorkspaceSync` appended die Active-ID auch ohne expliziten Create-Flow.

## TC-3: Forget bleibt device-local

1. Browser A: TripSwitcher → Trash-Icon auf `sync-test-a` → Klick.
2. In Browser A ist der Trip aus der Dropdown-Liste weg.
3. Firestore: `workspaceIds` behaelt `sync-test-a` (Forget ist lokale UI-Opt-out, kein Delete).
4. Browser B nach Reload: `sync-test-a` ist weiter in der Liste sichtbar.
5. Browser A nach Reload: `sync-test-a` taucht **wieder auf** (aus Remote wieder gemerged).

**Erwartet:** Forget entfernt NUR lokal, Sync fügt später wieder hinzu. Das ist dokumentierte Limitation von Phase 1. Finales Destruktiv-Forget kommt mit Phase 2 (Access Control).

## TC-4: Race-Condition — zwei Devices, neue Trips parallel

1. Browser A: "+ Neuen Trip" → `race-a` → anlegen.
2. Browser B (kein Reload dazwischen): "+ Neuen Trip" → `race-b` → anlegen.
3. Nach ~1s Firestore prüfen: `workspaceIds` enthält **beide** `race-a` und `race-b`.

**Erwartet:** `arrayUnion` serialisiert beide Writes atomar — kein Verlust.

## TC-5: Offline/Error resilient

1. DevTools → Network → Offline-Modus.
2. Beta öffnen (PWA-Cache) → TripSwitcher → "+ Neuen Trip" → `offline-test`.
3. App erstellt den Workspace-Doc lokal (optimistisch).
4. Console-Warning: `[useWorkspaceSync] failed to append workspaceId` (Offline Write failing OK).
5. Back online → der Trip sollte bei nächstem Mount (Firestore-Sync) auch in `workspaceIds` landen.

**Erwartet:** Offline-Erstellung funktioniert UI-seitig, Remote-Sync ist eventually-consistent.

---

## Post-Test Cleanup

- Test-Workspace-Docs in Firestore-Console löschen (optional).
- `users/{uid}.workspaceIds` bereinigen falls Schrott-Einträge.
- localStorage zurücksetzen.

---

## Rollback-Plan

Falls nach Deploy User-Profile-Updates fehlschlagen:
1. `useWorkspaceSync` in App.tsx auskommentieren → Feature aus.
2. `users/{uid}.workspaceIds` bleibt in Firestore (kein Dataloss).
3. App funktioniert wie vor #113 (pure localStorage).
