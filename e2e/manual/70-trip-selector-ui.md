# Manual Test: #70 — Trip-Selector UI (Dropdown + Neuen Trip anlegen)

**Ziel:** Multi-Trip-Switching per UI verifizieren — Dropdown im Header zeigt Trips, erlaubt Switch + Create, ohne Regression am Single-Trip-Standardfluss.

**Test-Umgebung:** Beta (`https://holiday-planner-beta.web.app/`) nach Auto-Deploy.

**Hinweis:** Bau auf #71 auf — localStorage-Key `rhp:active-workspace` + `rhp:known-workspaces` steuern jetzt die App.

---

## Test-Cases

### TC-1: Happy Path — Single-Trip, keine Regression

**Vorbedingungen:** Leeres localStorage. User eingeloggt.

1. Beta-URL öffnen, einloggen.
2. Header zeigt "Holiday Planner" + unterhalb Trip-Chip mit ID (z.B. `roma2026` — aus `VITE_FIREBASE_WORKSPACE_ID`), danach ▾.
3. POIs/Trip/Settings laden wie gewohnt.

**Erwartet:** "Autunno" ist weg, Chip ist sichtbar. Kein Layout-Bruch auf Mobile (Tab-Nav + UserMenu passen rechts).

### TC-2: Dropdown öffnen + schließen

1. Chip anklicken → Dropdown erscheint mit Liste: aktiver Trip mit ✓ links.
2. Outside-Click → Dropdown schließt.
3. Chip → Dropdown auf → **Escape** → Dropdown schließt.

**Erwartet:** Keine Scroll-Bugs. Auf Mobile nicht über den Bildschirmrand.

### TC-3: Neuen Trip anlegen

1. Dropdown öffnen → "Neuen Trip anlegen" klicken.
2. Inline-Form erscheint, Trip-ID Feld fokussiert.
3. Eingabe: `test-trip-${timestamp}` (id), "Test Trip April" (Anzeigename). "Anlegen" klicken.
4. Dropdown schließt. Trip-Chip zeigt neuen Anzeigenamen.
5. App lädt leeres Workspace (POI-Liste leer, Defaults in Settings).
6. Firestore-Console: `workspaces/test-trip-XXX` Doc existiert mit Default-Settings.

**Erwartet:** Smooth Switch ohne Reload. localStorage `rhp:known-workspaces` enthält beide Einträge.

### TC-4: Validierung der Trip-ID

1. Dropdown → "Neuen Trip anlegen".
2. ID eingeben: `Test Trip` (Großbuchstaben, Leerzeichen) → "Anlegen" → Fehlermeldung "Nur Kleinbuchstaben…".
3. ID eingeben: `roma2026` (oder anderer existierender) → Fehler "Trip-ID existiert bereits".
4. Abbrechen → Form schließt, zurück zur Liste.

**Erwartet:** Beide Fehlerfälle werden gefangen, kein Create-Versuch an Firestore.

### TC-5: Switch zurück auf ersten Trip

1. Nach TC-3 aktiv: `test-trip-XXX`.
2. Dropdown → Ersten Eintrag (`roma2026`) klicken.
3. Active-Indicator (✓) wandert, App lädt Rom-Daten zurück.
4. POIs wieder da, Settings der Rom-Reise.

**Erwartet:** Sauberer Listener-Switch (keine vermischten Daten), State-Reset.

### TC-6: Trip aus Liste entfernen (forget)

1. Dropdown öffnen, auf nicht-aktiven Trip hovern → Trash-Icon erscheint rechts.
2. Klick → Eintrag verschwindet.
3. localStorage prüfen: Entry raus.
4. Firestore-Console: Workspace-Doc existiert noch (bewusst — nur lokales Forget).

**Erwartet:** Aktiver Trip hat kein Trash-Icon (kann nicht entfernt werden).

### TC-7: localStorage-Persistenz nach Reload

1. Nach TC-3+5: zwei Trips in Liste (`roma2026` aktiv, `test-trip-XXX` zweit).
2. **Full Reload** (Cmd+Shift+R).
3. Dropdown öffnen → beide Einträge da, `roma2026` aktiv.

**Erwartet:** Zustand überlebt Reload.

### TC-8: Mobile Layout (iPhone-Viewport 375×667)

1. DevTools → Device Toolbar → iPhone SE.
2. Header rendert korrekt: Holiday Planner + Chip links, Tabs + UserMenu rechts.
3. Chip → Dropdown öffnet, bleibt in Viewport.
4. Inline-Create-Form nutzbar.

**Erwartet:** Kein Horizontal-Scroll, kein Overflow.

### TC-9: Empty-State (neues Device)

1. DevTools → Application → Local Storage → alle `rhp:*` Keys löschen.
2. Reload.
3. Dropdown zeigt genau einen Eintrag: env-Fallback (`roma2026`).

**Erwartet:** Auto-Seed funktioniert, keine Crashes durch leere Liste.

---

## Post-Test Cleanup

- `test-trip-*` Firestore-Docs löschen (Firestore-Console → `workspaces` → entsprechende Docs)
- localStorage bei Bedarf zurücksetzen: `localStorage.clear()`
