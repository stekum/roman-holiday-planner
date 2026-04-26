# Test: Default-Trip-Pin (#227)

**Testen auf:** Beta (https://holiday-planner-beta.web.app/) → nach Validierung Prod

**Voraussetzung:**
- Mindestens zwei Trips angelegt + bist Member von beiden
- Optional: zweites Device/Inkognito-Tab um Cross-Device-Sync zu prüfen

---

## TC-1: Trip pinnen + Bootstrap auf neuem Tab

1. Trip-Switcher öffnen, über Trip A hovern → **PinOff-Icon** (leer) erscheint links neben dem Pencil
2. PinOff klicken → Icon wird zu **gefülltem Pin in Terracotta-Farbe**, immer sichtbar (nicht nur bei Hover) für diesen Trip
3. Hard-Reload (Cmd+Shift+R) oder neuer Inkognito-Tab mit gleichem Account
4. **Erwartung:** App öffnet automatisch in Trip A, NICHT in einem anderen zuletzt-aktiven Trip

## TC-2: Pin auf anderen Trip umstellen

1. Trip A ist gepinnt (aus TC-1)
2. Trip-Switcher öffnen, über Trip B hovern → PinOff-Icon
3. PinOff bei Trip B klicken → Trip B wird gepinnt, Trip A's Pin wird automatisch entfernt (radio-select)
4. **Erwartung:** Genau ein Trip hat den gefüllten Pin, der vorherige Default zeigt wieder PinOff (nur auf Hover)

## TC-3: Pin lösen (unpin)

1. Trip A ist gepinnt
2. Auf den gefüllten Pin von Trip A klicken
3. **Erwartung:** Pin wird wieder zu PinOff, kein Trip ist mehr gepinnt
4. Hard-Reload → App öffnet im zuletzt-aktiven Trip (kein Default mehr)

## TC-4: Manuelle Trip-Switches überschreiben Pin nicht

1. Trip A ist als Default gepinnt
2. Im Trip-Switcher Trip B auswählen → App wechselt zu Trip B
3. Trip C auswählen → wechselt zu Trip C
4. Trip-Switcher öffnen → **Erwartung:** Pin ist immer noch auf Trip A
5. Hard-Reload → App öffnet zurück in Trip A (Default greift)

## TC-5: Cross-Device-Sync

1. Auf Device 1: Trip A pinnen
2. Auf Device 2 (mit demselben Google-Account): Hard-Reload oder neu öffnen
3. **Erwartung:** Device 2 öffnet auch in Trip A
4. Auf Device 2: Pin auf Trip B umstellen
5. Auf Device 1: Hard-Reload → Trip B öffnet

**Latenz-Hinweis:** Cross-Device-Sync läuft über `users/{uid}.defaultWorkspaceId`. Updates sind Firestore-real-time (1-2s).

## TC-6: Gepinnter Trip nicht mehr zugänglich

**Setup:** Owner hat dich aus Trip A entfernt; Trip A war dein gepinnter Default.

1. App neu öffnen
2. **Erwartung:** App versucht Trip A zu öffnen, bekommt aber permission-denied. UI zeigt einen Error-State (workspace listener error).
3. **Workaround:** Trip-Switcher öffnen → anderen Trip wählen → Pin auf einen erreichbaren Trip umstellen.

(Bekannte Limitation — wir validieren nicht pre-mount ob der Default noch erreichbar ist. Falls das mehr als ein Edge-Case wird, gibt's einen Fallback-on-Permission-Denied in einer Folge-Iteration.)

---

## Notes

- Pin-State lebt in `users/{uid}.defaultWorkspaceId` (Firestore). Lokal wird ein `sessionStorage`-Marker `rhp:default-workspace-bootstrapped` gesetzt damit der Default nur einmal pro Tab greift (sonst würde jede Trip-Wahl direkt überschrieben).
- Zum manuellen Reset des Bootstrap-Markers (z.B. um TC-1 nochmal zu testen ohne neuen Tab): in DevTools-Console `sessionStorage.removeItem('rhp:default-workspace-bootstrapped')` + Reload.
