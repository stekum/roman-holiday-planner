# Manual Test: #74 — Multi-Homebase pro Trip (datumsbasiert)

**Ziel:** Jeder Trip kann mehrere Homebases mit optionalem Datums-Range haben. Die App wählt automatisch die für den aktiven Tag passende — Grundlage für Multi-City-Trips wie Japan (Tokyo → Kyoto → Osaka).

**Test-Umgebung:** Beta (`https://holiday-planner-beta.web.app/`) nach Deploy.

---

## Vorbedingungen

- Ein Trip mit Tripdaten, z.B. `japan-may` mit Start 2026-05-25, Ende 2026-05-31
- Nach PWA-Cache-Reset (Cmd+Shift+R bzw. Website-Daten löschen auf iOS)

## TC-1: Legacy-Trip — keine Regression

1. Rom-Trip (`default`) öffnen — hat single legacy `settings.homebase` (Trastevere).
2. Entdecken-Tab: Map zentriert auf Trastevere, POI-Cards zeigen Distanz zur Homebase.
3. Settings → **Homebases** (umbenannt von "Homebase"): ein Eintrag sichtbar (BMGA Trastevere), KEIN Datums-Range gesetzt.

**Erwartet:** Legacy single-homebase-Workspace zeigt die Homebase wie vorher via `getHomebases()`-Resolver-Fallback.

## TC-2: Multiple Homebases anlegen (Japan-Szenario)

1. Japan-Trip (`japan-may`) öffnen. Tripdaten 2026-05-25 bis 2026-05-31.
2. Settings → Homebases → "+ Homebase hinzufügen" → **Hotel in Tokyo** (z.B. Park Hyatt Tokyo) → pick.
3. Für Tokyo-Homebase Range setzen: Von = 2026-05-25, Bis = 2026-05-27.
4. "+ Homebase hinzufügen" → **Ryokan in Kyoto** → Range 2026-05-28 bis 2026-05-29.
5. "+ Homebase hinzufügen" → **Hotel Osaka** → Range 2026-05-30 bis 2026-05-31.
6. Liste zeigt 3 Einträge mit Datums-Ranges.

**Erwartet:** Alle 3 Homebases bleiben persistiert, Reload → alles da. Firestore-Doc hat `settings.homebases: [3 Einträge]`, `settings.homebase` (legacy) wurde weggeräumt.

## TC-3: Per-Day-Homebase-Auswahl im Reise-Tab

1. Reise-Tab → Tag 25. Mai auswählen.
2. DayPlanner zeigt oben die Tokyo-Homebase (Park Hyatt).
3. Route-Summary + Walking-Distances werden relativ zur Tokyo-Homebase berechnet.
4. Tab-Switch auf Tag 28. Mai → Kyoto-Homebase als Tagesstart.
5. Tab-Switch auf Tag 30. Mai → Osaka-Homebase.

**Erwartet:** Routen + Distanzen reagieren automatisch auf den Tag-Wechsel.

## TC-4: AI-Tagesplan mit Tages-Homebase

1. Reise-Tab → Tag 28. Mai (Kyoto) → AI-Tagesplan-Button.
2. Prompt eingeben: "Kultur-Tag mit Tempeln und gutem Mittagessen".
3. Generiere.

**Erwartet:** Gemini baut den Plan ausgehend von der **Kyoto-Homebase** — nicht Tokyo. POI-Vorschläge sind in Kyoto-Nähe, Walking-Routes starten am Ryokan.

## TC-5: Entdecken-Tab während der Reise

**Heute ist vor dem Trip** (Beispiel: 2026-04-24 < tripStart 2026-05-25):

1. Entdecken-Tab öffnen.
2. Map zentriert auf **tripStart-Homebase** (Tokyo).
3. POI-Cards zeigen Distanzen zur Tokyo-Homebase.

**Heute ist innerhalb des Trips** (simulieren durch Tripdates-Anpassung):

4. Tripdaten auf "Start heute" umstellen → Entdecken-Tab Map springt zur heute-Homebase.

**Erwartet:** `getCurrentHomebase()` wählt smart: pre-trip → tripStart-Homebase, in-trip → today's Homebase.

## TC-6: Homebase ohne Date-Range (Catch-All)

1. Neue Homebase "Büro Berlin" ohne Datums-Range hinzufügen (Von/Bis leer lassen).
2. Für alle drei anderen Homebases den Range setzen.

**Erwartet:** An Tagen die in keinem Range liegen (z.B. vor tripStart), wird die Catch-all-Homebase verwendet. In-Range-Tage nutzen ihre range-Homebase.

## TC-7: Überlappende Ranges — First-wins

1. Tokyo-Range 2026-05-25 bis 27, Kyoto-Range 2026-05-27 bis 29 (überschneidet 27.05.).
2. Tag 27. Mai → Tokyo-Homebase wird gewählt (Tokyo steht vor Kyoto in der Liste).

**Erwartet:** `getHomebaseForDay` nimmt den ersten Range-Match — dokumentiert in JSDoc.

## TC-8: Homebase löschen

1. Settings → Homebases → Trash-Icon auf Tokyo-Homebase.
2. Bestätigen → Homebase verschwindet aus Liste.
3. Tag 25. Mai (war Tokyo-Range): fällt jetzt auf erste andere Homebase (Kyoto-Range matcht nicht → catch-all oder erste).

**Erwartet:** Clean delete, Fallback greift korrekt.

## TC-9: Cross-Device-Sync

1. Browser A: Homebases zu Japan hinzufügen.
2. Browser B: gleicher Account, Japan-Trip öffnen.
3. Homebases sind sofort da (via Firestore listener).

**Erwartet:** Multi-Homebase-Listen synchronisieren via Firestore `onSnapshot`.

---

## Known Limits (dokumentiert)

- **Kein Auto-Photo-Sync:** HomebasePhotoSync wurde entfernt. Neue Homebases via PlacesAutocomplete haben Photo inklusive; manuell angelegte Homebases ohne Photo bleiben ohne. Workaround: im Editor auf Photo klicken + URL einfügen (legacy-Feature). Re-enable als "bulk photo sync" wenn gewünscht (#follow-up).
- **Legacy `setHomebase`-API** in useWorkspace bleibt bestehen als Shim (falls future-code sie braucht); nicht mehr von App.tsx aufgerufen.
- **Auto-create bei neuem Workspace**: Firestore-Doc wird ohne `homebases`-Feld erstellt (nur DEFAULT_SETTINGS). User muss Homebase(s) manuell in Settings anlegen. Gleiches Verhalten wie pre-#74.

## Post-Test Cleanup

- Test-Homebases via Trash-Icon entfernen oder in Firestore-Console `settings.homebases`-Array bereinigen.
- localStorage bleibt workspace-scoped — nichts zu löschen.
