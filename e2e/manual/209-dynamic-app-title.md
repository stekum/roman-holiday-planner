# Test: Dynamischer App-Titel aus TripConfig (#209)

**Testen auf:** Beta (https://holiday-planner-beta.web.app/) → nach Validierung Prod

**Voraussetzung:** Mindestens zwei Trips mit unterschiedlich konfigurierter `tripConfig.city` (z.B. Rom + Japan).

---

## TC-1: Header zeigt City-Präfix

1. Trip mit `city = "Japan"` öffnen
2. **Erwartung:** Header `<h1>` zeigt **„Japan Holiday Planner"** (statt nur „Holiday Planner")
3. Browser-Tab-Titel zeigt **„Japan Holiday Planner"**

## TC-2: Trip-Wechsel aktualisiert Header + Tab

1. Im Trip-Switcher zu Trip mit `city = "Rom"` wechseln
2. **Erwartung:** Header wechselt sofort zu **„Rom Holiday Planner"**
3. Browser-Tab-Titel ändert sich entsprechend (sichtbar wenn der Tab nicht aktiv ist)

## TC-3: Trip ohne City

1. Frischen Trip anlegen, in Settings noch keine City eingeben (TripConfig-Editor leer lassen oder default)
2. **Erwartung:** Solange `city` leer ist, zeigt Header **„Holiday Planner"** (kein führendes Leerzeichen)
3. City eintragen + speichern → Header passt sich live an (Firestore-Realtime-Update)

## TC-4: Loading-State zeigt nicht den Default

1. Hard-Reload (Cmd+Shift+R) auf einem Japan-Trip
2. **Erwartung:** Header zeigt während des Connects **nicht** kurz „Rom Holiday Planner" (= TripConfig-Default fallback) — sondern direkt „Holiday Planner" (leerer cityName) bis Workspace-Status `ready` ist, dann „Japan Holiday Planner".

## TC-5: Mobile-Smoke

1. Auf iPhone Beta öffnen
2. Header `truncate` greift wenn lange City-Namen — kein Layout-Bruch (z.B. „San Francisco Holiday Planner" sollte ohne horizontales Scrollen passen, ggf. mit Ellipsis)
