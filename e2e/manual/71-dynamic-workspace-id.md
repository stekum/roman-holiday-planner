# Manual Test: #71 — Dynamischer workspaceId (Listener-Switch)

**Ziel:** Verifizieren dass die Workspace-Infrastruktur jetzt Context-basiert arbeitet, Listener bei Switch sauber aufräumen, und Single-Workspace-Modus (ohne UI-Switcher) weiter wie zuvor funktioniert.

**Test-Umgebung:** Beta (`https://holiday-planner-beta.web.app/`) nach Auto-Deploy.

**Hinweis:** #70 Trip-Selector UI kommt separat. Bis dahin gibt es *keine* sichtbare Switch-Möglichkeit — der Switcher wird manuell via DevTools-Console getestet.

---

## Test-Cases

### TC-1: Happy Path — bestehender Workspace lädt wie vorher

**Vorbedingungen:** `.env.local` hat `VITE_FIREBASE_WORKSPACE_ID=roma2026` (oder leer → `default`). `localStorage` leer.

1. Beta-URL öffnen, einloggen.
2. Entdecken-Tab: POIs werden geladen, Karte zeigt Marker.
3. Reise-Tab: Tagesplan + Familien sichtbar.
4. Settings: Homebase, Tripdaten, Familien-Liste sichtbar.

**Erwartet:** Alles wie vor dem Refactor — keine Regression.

### TC-2: localStorage-Persistenz

**Vorbedingungen:** TC-1 abgeschlossen.

1. DevTools → Application → Local Storage → `rhp:active-workspace` existiert **nicht** (nur gesetzt nach explizitem Switch).
2. Console: `localStorage.setItem('rhp:active-workspace', 'roma2026'); location.reload();`
3. App lädt gleichen Workspace.

**Erwartet:** `localStorage.rhp:active-workspace` überschreibt env-Fallback. App verhält sich identisch.

### TC-3: Listener-Switch (Core der Story)

**Vorbedingungen:** Zwei Workspaces in Firestore existieren: `roma2026` (regulär) und `test-switch` (manuell angelegt mit anderen POIs oder leer).

1. App startet mit `roma2026` (Default).
2. POIs der Entdecken-Liste merken.
3. DevTools-Console:
   ```js
   // Context-Setter via React-Hook ist nur innerhalb React erreichbar.
   // Workaround bis #70 UI: localStorage + reload.
   localStorage.setItem('rhp:active-workspace', 'test-switch');
   location.reload();
   ```
4. App zeigt jetzt `test-switch`-POIs (leer oder andere Liste).
5. Zurück: `localStorage.setItem('rhp:active-workspace', 'roma2026'); location.reload();`

**Erwartet:** POIs/Settings/Tripplan wechseln vollständig. Kein Leak alter Daten. Kein Firestore-Error in Console.

### TC-4: Non-existing Workspace → Auto-create

**Vorbedingungen:** Workspace `fresh-test-${Date.now()}` existiert nicht.

1. Console: `localStorage.setItem('rhp:active-workspace', 'fresh-test-new'); location.reload();`
2. App lädt. POI-Liste leer (außer SEED_POIS falls aktiv).
3. Firestore-Konsole prüfen: `workspaces/fresh-test-new` wurde automatisch mit Default-Settings erstellt.
4. Cleanup: Workspace-Doc aus Firestore löschen.

**Erwartet:** Auto-create wie vor dem Refactor. Kein Crash.

### TC-5: Auth + Firestore-Rules

**Vorbedingungen:** User hat Zugriff auf `roma2026`, nicht auf einen fremden Workspace `locked-xyz`.

1. Console: `localStorage.setItem('rhp:active-workspace', 'locked-xyz'); location.reload();`
2. Firestore-Rules verweigern Listener.

**Erwartet:** `status='error'` im Hook → UI zeigt Fehler-State. Kein Crash. Nach Reset auf validen Workspace funktioniert alles wieder.

---

## Post-Test

- `localStorage.removeItem('rhp:active-workspace')` zum Zurücksetzen.
- Keine neuen Firestore-Docs in Production-DB zurücklassen.
