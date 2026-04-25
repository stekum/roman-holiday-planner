# Design-Doc: #228 Workspace Access Control + Einladungs-Flow

**Status:** Draft, in Diskussion mit Stefan
**Kontext:** Phase 2 von #113. Phase 1 (Cross-Device-Sync von `user.workspaceIds`) ist live. Heute hat **jeder approved User** Lese-/Schreibrecht auf **jeden** Workspace (`firestore.rules` Z.66-72: `allow read, write: if hasAccess()`). Das soll auf Membership-basiert eingeschränkt werden.
**Ziel:** v3.0 — Japan-Ready (24. Mai 2026). Stefan hat ~4 Wochen Buffer.
**Akute Migration:** Stefan-Account hat 1× Rom + 4× Japan-Varianten. Plus: Sandra wird Member.

---

## Frage 1 — Schema-Form

Wo lebt die Membership? Drei plausible Varianten:

### Option 1A: `workspaces.{ownerUid, memberIds[]}`
```ts
// workspaces/{id}
{ ownerUid: string, memberIds: string[], createdAt: timestamp, settings: {...}, tripPlan: {...} }
```
- ✅ Atomic mit Workspace-Doc, Rules-Check ohne `get()` (`memberIds.hasAny([request.auth.uid])`)
- ✅ Eine Quelle der Wahrheit pro Workspace
- ❌ Beim Listen-View „meine Workspaces" auf User-Seite muss man trotzdem `users/{uid}.workspaceIds` syncen (oder Firestore-Query mit `array-contains` — aber dann pro Login 1 Query)
- ❌ Member-Management (jemanden entfernen) braucht Workspace-Schreib-Recht — d.h. Owner muss Workspace-Doc patchen

### Option 1B: `users.{workspaceIds[]}` als Single-Source
```ts
// users/{uid}
{ ..., workspaceIds: string[], workspaceRoles: { [wsId]: 'owner'|'member' } }
// workspaces/{id} kennt seine Members nicht
```
- ✅ Simpel auf User-Seite (existiert schon dank Phase 1)
- ❌ Rules-Check braucht teures `get(/users/$(uid))` pro Workspace-Read → +1 Read pro Page-Load, schlechte Perf
- ❌ „Wer ist alles in diesem Workspace?" — kein Reverse-Lookup ohne Index/Collection-Group-Query
- ❌ Member-Add muss in **fremdes** User-Doc schreiben → Rules-Komplexität

### Option 1C: Hybrid — `workspaces.{ownerUid, memberIds}` + `users.{workspaceIds}` als Mirror
- ✅ Beste Performance (Rules ohne `get()`, Listen ohne Query)
- ✅ Reverse-Lookup beidseitig
- ❌ Konsistenz: zwei Schreibvorgänge pro Add/Remove. Drift möglich.
- ❌ Mitigation via Cloud Function `onWriteWorkspaceMembers` → spiegelt nach `users/*.workspaceIds`

### **Empfehlung: 1C (Hybrid)**
`workspaces.memberIds` ist authoritative für Rules-Check (Performance + Atomarität). `users.workspaceIds` ist denormalisierter Read-Cache fürs UI (existiert eh aus Phase 1). Eine kleine Cloud Function (~30 Zeilen) hält den Mirror in Sync. Drift-Toleranz akzeptabel weil Rules nur die `workspaces`-Seite prüfen — `users.workspaceIds` ist nur Convenience für „Trip-Switcher zeigt meine Trips".

**Trade-off:** Funktion schreiben/deployen = 1 zusätzliche Komponente. Alternative ohne Function: Mirror clientseitig schreiben in zwei Operationen — geht bei kleinen Member-Listen, riskiert aber Drift bei Crashes mid-write. Bei <10 Membern pro Workspace tolerierbar.

---

## Frage 2 — Einladungs-Mechanik

### Option 2A: Magic-Link mit Token
```
https://holiday-planner.web.app/?invite=abc123xyz
```
- Owner klickt „Trip teilen" → generiert Token-Doc `invites/{token}` mit `{workspaceId, createdBy, expiresAt, used: false}`
- Empfänger öffnet Link → wenn eingeloggt + approved → automatisch zu `memberIds` hinzugefügt + redirect
- ✅ Niedrigste Friction (1 Klick)
- ✅ Invitee muss nicht wissen welcher Workspace
- ❌ Link kann weitergeleitet werden → Token sollte single-use sein
- ❌ Wenn Empfänger noch nicht approved ist (kein Account): Sign-in zuerst, Token in URL durchreichen — komplexer Flow

### Option 2B: 6-Zeichen-Code zum Eingeben
- Owner generiert 6-stelligen Code (z.B. `ROMA42`), Code ist 24h gültig
- Empfänger geht in Settings → „Trip beitreten" → Code eintippen
- ✅ Code ist mündlich übertragbar (über WhatsApp, am Telefon)
- ✅ Bewusster Akt — kein „aus Versehen geklickt"
- ❌ Mehr Friction (manuelles Eintippen)
- ❌ Code-Collision-Risiko bei kurzer Länge (mit 36^6 ≈ 2 Mrd. ok für unsere Größenordnung)

### Option 2C: Direct-Add per E-Mail
- Owner gibt E-Mail ein, falls User existiert → direkt in `memberIds` packen, falls nicht → `pendingInvites/{email}` Doc, beim ersten Login auf diese E-Mail wird auto-joined
- ✅ Kein Link-Sharing nötig — Familie-Setup-mäßig sauber
- ✅ Auch für Pre-Approval geeignet
- ❌ Owner muss E-Mail wissen
- ❌ User mit anderer Login-E-Mail (z.B. Apple-Hide-My-Email) bricht das

### **Empfehlung: 2A (Magic-Link, single-use, 7 Tage gültig)**
Familien-Anwendung, niedrige Friction wichtiger als Sicherheit-im-IT-Sinn. Stefan teilt Link über WhatsApp/iMessage. Single-Use schützt gegen versehentliche Weitergabe.
- Wenn Empfänger nicht eingeloggt: Token in `sessionStorage` zwischenparken, nach Sign-in/Approval einlösen.
- Wenn Empfänger noch `pending`: Sichtbarer Hinweis „Du wartest auf Freigabe — Trip wird automatisch verbunden sobald du freigegeben bist."

---

## Frage 3 — Erstanmeldung des Empfängers

Wenn jemand den Invite-Link öffnet und schon `approved` ist — was passiert?

### Option 3A: Direkt rein, keine Rückfrage
Token einlösen → `memberIds`-Update → Active-Workspace auf den neuen umstellen → App lädt im neuen Trip → kleiner Toast „Du bist jetzt Mitglied von **Roma 2026**".
- ✅ Schnellster Weg
- ❌ Wenn jemand grade aktiv im eigenen Trip plant, ist er plötzlich woanders
- ❌ Bei akzidenteller Token-Weiterleitung → Membership entstanden ohne Bewusstsein

### Option 3B: Akzeptier-Dialog
Modal: „**Stefan** hat dich zu **Roma 2026 — Familienreise** eingeladen. [Beitreten] [Später]"
- ✅ Bewusster Akt
- ✅ Owner-Name + Trip-Name werden gezeigt → Sanity-Check
- ❌ 1 Klick mehr

### Option 3C: Akzeptier-Dialog + Wahl „aktiv setzen oder nicht"
Wie 3B, aber zusätzlich Toggle „Sofort öffnen" (default: an).
- ✅ Maximum Kontrolle
- ❌ Choice-Overload für ein simples Family-Sharing-Szenario

### **Empfehlung: 3B (Akzeptier-Dialog mit Owner-Name + Trip-Name)**
Bewusster Akt = Vertrauen ins System. Die zusätzlichen 2 Sekunden sind in einem 5-Tage-Trip-Setup egal. Trip wird nach Akzeptanz automatisch aktiv (kein Extra-Toggle wie 3C — überdesignt).

---

## Frage 4 — Family-Auswahl beim Beitreten

Heute hat jeder Workspace eine Liste `families: Family[]` in `settings`. Wenn jemand neu beitritt, wem gehört er an?

### Option 4A: Member wählt aus existierender Family-Liste
Beim Akzeptier-Dialog (Frage 3): Dropdown „Du gehörst zu …" mit allen Families des Workspaces. Plus Option „Neue Family anlegen".
- ✅ Member entscheidet — passt zu „Familie A vs. Familie B" Use-Case
- ❌ Was wenn Owner die Families noch nicht angelegt hat? → „Neue Family" muss immer da sein

### Option 4B: Owner ordnet beim Einladen zu
Owner generiert Invite mit dropdown „Lade ein als Mitglied von …". Token speichert `intendedFamilyId`.
- ✅ Klar definiert vorab
- ❌ Owner muss Family vorher anlegen
- ❌ Bricht wenn Owner die Family-ID inzwischen gelöscht hat

### Option 4C: Keine automatische Zuordnung — User wird zu „Mitglieder ohne Family"
User wird einfach Member, Family-Zuordnung ist orthogonal und passiert im Settings-Tab.
- ✅ Trennung von Concerns: Membership ≠ Family
- ❌ Bricht heute existierende Vote/Comment-Logik (`familyId` ist required für Votes)

### **Empfehlung: 4A (User wählt beim Beitreten, mit „Neue Family"-Fallback)**
Zwei-Familien-Use-Case ist genau das was Roman Holiday Planner vom Tag 1 modelliert. „Neue Family" als Fallback deckt 1-Familie-Szenario (Stefan + Sandra alleine) ab.

---

## Frage 5 — Owner-Rechte vs. Member-Rechte

Was darf der Owner exklusiv?

### Vorschlag (Diskussionsbasis)
| Aktion | Owner | Member |
|---|---|---|
| Trip lesen (POIs, Plan, Settings) | ✅ | ✅ |
| POIs hinzufügen/editieren/löschen | ✅ | ✅ |
| Tagesplan editieren | ✅ | ✅ |
| Voten, kommentieren | ✅ | ✅ |
| AI-Features nutzen | ✅ | ✅ |
| Trip-Settings ändern (Datum, Homebase, City) | ✅ | ✅ |
| **Family-Liste editieren** | ✅ | ❌ (nur eigene Family-Daten) |
| **Member einladen** | ✅ | ❌ |
| **Member entfernen** | ✅ | ❌ |
| **Trip löschen** | ✅ | ❌ |
| **Trip umbenennen** | ✅ | ❌ |
| **Owner-Übergabe** | ✅ | ❌ |

**Begründung:** Symmetrische Schreibrechte auf Inhalte (POIs, Plan) — sonst macht Co-Planning keinen Sinn. Asymmetrische Rechte nur für Workspace-Lifecycle (Members, Löschen, Umbenennen). Family-Liste ist Owner-Sache weil sie die Grundstruktur vorgibt.

**Edge-Case:** Owner verlässt selbst den Trip → muss vorher Owner an jemand anderen übergeben oder Trip löschen. UI sollte das erzwingen.

**Diskussionspunkte:**
- (a) Sollen Members Family-Liste lesen aber nicht editieren? → Ja, sonst funktionieren Vote-Anzeigen nicht.
- (b) Soll es eine dritte Rolle „Viewer" (read-only) geben? → **Empfehlung: nein** für v1. KISS. Kann später nachgerüstet werden.
- (c) Trip löschen = Hard-Delete oder Soft (in Trash)? → **Empfehlung: Soft** (`workspaces.{deletedAt}`) → Recovery möglich, Rules filtern auto. Aber das ist v3.2-Scope (#79 Trip-Archivierung) — heute hard delete reicht.

---

## Frage 6 — Migration der existierenden Workspaces

Stefan hat mehrere Workspaces:
- 1× Rom (alter Workspace, Sandra schon User?)
- 4× Japan-Varianten (Stefan allein)

Plus: weitere User die in der Vergangenheit irgendwann mal einen Workspace berührt haben (z.B. Sandra über `sandkumm@gmail.com` — pre-approved).

### Migrations-Strategie

**Schritt 1 — Pre-Migration-Audit (read-only Script):**
```bash
node scripts/audit-workspaces.mjs
# Output: pro Workspace: {id, settings.families[], known users who touched it}
```

**Schritt 2 — Migration-Script (`scripts/migrate-228.mjs`):**
Für jeden Workspace:
- `ownerUid` = Stefan's UID (Admin) — erst mal pauschal, weil Stefan technisch alle erstellt hat
- `memberIds` = `[Stefan.uid]` plus jede UID die in `users/*.workspaceIds` diesen Workspace listet

**Schritt 3 — Owner-Korrektur danach (manuell):**
Für die Japan-Workspaces ist Stefan eh Owner. Für Rom: Stefan und Sandra prüfen wer Owner sein soll, ggf. via UI „Owner übergeben" korrigieren.

**Schritt 4 — Rules-Deploy:**
Rules-Update ist atomic — wenn neue Rules deployed sind und alte App-Instanzen offen sind, brechen die. Mitigation:
- (a) Migration zuerst → dann Rules-Deploy → dann Beta testen → dann Prod-Deploy
- (b) Rules-Deploy hat Hard-Cutover-Charakter, kurze Downtime in Kauf nehmen (Reload-Hint via Service-Worker-Update?)
- **Empfehlung: (a) plus 24h Beta-Burn-In bevor Prod**. Stefan ist eh die einzige Last, niemand anders aktiv im System.

**Schritt 5 — Backwards-Compat-Window:**
Während der Migration sollen die neuen Rules **beide** Modelle akzeptieren:
```js
allow read, write: if hasAccess() && (
  isMember(workspaceId) ||
  // Legacy fallback während Migration:
  !exists(/databases/.../workspaces/$(workspaceId)) ||
  !('memberIds' in get(...).data)
);
```
Nach erfolgreicher Migration (alle Workspaces haben `memberIds`) wird der Fallback in Rules entfernt → zweiter Rules-Deploy.

### **Empfehlung-Summary**
1. Audit-Script schreiben + Stefan über Output gucken lassen
2. Migration-Script mit Stefan-als-Owner default
3. Rules mit Backwards-Compat-Fallback deployen (Beta zuerst, 24h Burn-In)
4. Manuelle Owner-Korrekturen
5. Final-Rules ohne Fallback deployen

---

## Implementierungs-Sequenz (wenn alle Fragen beantwortet)

1. **Schema + Migration-Script** (size:M, ~3h) — read-only audit + write-script + Beta-Test
2. **Cloud Function für Mirror** (size:S, ~1h) — `onWrite` `workspaces` → `users.workspaceIds`
3. **Rules mit Backwards-Compat** (size:M, ~2h) — inkl. Emulator-Tests
4. **Invite-Token-Schema + Owner-UI** (size:M, ~3h) — `invites/{token}` Collection, „Trip teilen"-Button
5. **Empfänger-Flow** (size:M, ~3h) — URL-Param-Handling, Akzeptier-Dialog, Family-Wahl
6. **Member-Liste in Settings** (size:S, ~2h) — Read-Only für Members, Edit für Owner
7. **Owner-Übergabe + Trip löschen** (size:S, ~2h)
8. **Final-Rules-Deploy + Cleanup** (size:S, ~1h)

**Gesamt: ~17h Engineering, plus ~4h Testing/Migration auf Prod.** Passt in size:L. Stefan-validierter Burn-In auf Beta dauert real-time 24-48h.

---

## Offene Risiken

- **Rules-Deploy bricht offene Sessions:** SW-Update-Prompt bei neuen Rules + manueller Reload. Akzeptabel bei interner App.
- **Magic-Link-Token in URL leakt in Browser-Historie/Server-Logs:** Token sollte short-lived (7d) + single-use sein. Plus: Empfehlung das Sharing über E2E-verschlüsseltes Channel (WhatsApp/iMessage) zu machen — kommt eh aus dem Use-Case.
- **Cloud-Function-Mirror ist eventually consistent:** Bei Race-Conditions kurzes Delay zwischen `memberIds`-Add und `users.workspaceIds`-Sichtbarkeit. UI sollte beim Beitreten optimistic-update machen statt auf Mirror zu warten.
- **Pre-Approved-User ohne UID:** `sandkumm@gmail.com` hat noch keinen User-Doc bevor sie sich einloggt. Invite-Flow muss „Lade per E-Mail ein" als Fallback haben (Option 2C als Sekundär-Mechanik) — oder Stefan invited Sandra erst **nachdem** sie sich erstmals eingeloggt hat. **Empfehlung: zweites — keep simple**.

---

## Was als Nächstes

Stefan diskutiert die 6 Empfehlungen. Bei jeder Frage entweder ✅ Empfehlung übernehmen oder ✋ andere Option / Mischform. Sobald alle 6 entschieden sind: Implementations-Plan finalisieren + erstes Feature-Branch öffnen.

Wenn größere Schema-Änderung gewünscht (z.B. „Multi-Owner statt Single-Owner") → das ist eine 7. Frage und sollte hier landen bevor Code geschrieben wird.
