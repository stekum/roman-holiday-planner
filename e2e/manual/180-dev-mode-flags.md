# Test: #180 — Dev-Mode-Flags für expensive APIs

**Ziel:** Im lokalen Dev (`npm run dev`) keine Google-Directions- oder
Places-API-Calls mehr, außer man setzt explizit `localStorage.DEBUG_MAPS='1'`.

**Vorbedingungen**
- `npm run dev` läuft
- Browser DevTools Network-Tab offen
- Localhost-URL geladen, Login durch

---

## TC-1: Dev-Default → keine Directions-Calls

1. DevTools Network-Tab clearen, Filter auf `directions`
2. Tab **Reise** öffnen, auf einen Tag mit ≥2 Stops wechseln
3. Auf **Karte** schauen

**Erwartetes Ergebnis:**
- ✅ **0 Requests** gegen `maps.googleapis.com/maps/api/directions`
- ✅ Route-Linie wird als **gerade Linie** zwischen Stops gezeichnet (Fallback)
- ✅ Console zeigt `[devFlags] skipped RoutePolyline (Directions) — …`

---

## TC-2: Dev-Default → AddFromMap skipt Places-Details

1. Filter auf `place` / `places`
2. FAB + → **Auf Karte** → irgendwo hin tippen (auf Google-POI)
3. Bottom-Sheet öffnet

**Erwartetes Ergebnis:**
- ✅ **0 Requests** gegen `maps.googleapis.com` Places-Endpunkte
- ✅ Sheet zeigt „Dev Place / Dev Mode" als Name/Adresse (Platzhalter)
- ✅ Console `[devFlags] skipped AddFromMap …`

---

## TC-3: Dev-Default → Vibes-Suche blockiert

1. FAB + → **Vibes-Suche**
2. Frage eingeben, „Finden" klicken

**Erwartetes Ergebnis:**
- ✅ Gemini läuft weiter (AI-Criteria erscheint kurz)
- ✅ **0 Requests** gegen Places-textSearch
- ✅ Error-Banner: „Dev-Mode: Places-Search geskippt. localStorage.DEBUG_MAPS='1' + reload um echt zu suchen."

---

## TC-4: Opt-In → echte APIs wieder an

1. Browser-Console: `localStorage.setItem('DEBUG_MAPS', '1')` + `location.reload()`
2. TC-1/2/3 erneut durchspielen

**Erwartetes Ergebnis:**
- ✅ TC-1: Directions-Calls erscheinen wieder, echte Route-Polyline
- ✅ TC-2: echter Place-Name/Adresse
- ✅ TC-3: echte Places-Results in der Liste
- ✅ Console zeigt **keine** `[devFlags] skipped` mehr

---

## TC-5: Prod/Beta unberührt

Bei Beta/Prod (`import.meta.env.DEV === false`) soll das Flag **keine Wirkung** haben — egal was in localStorage steht, echte APIs laufen.

1. Öffne Beta mit `localStorage.setItem('DEBUG_MAPS', '1')` (versuchte Deaktivierung)
2. Tab Reise mit Tour

**Erwartetes Ergebnis:**
- ✅ Directions-Calls laufen normal
- ✅ Keine `[devFlags]`-Logs (Vite eliminiert die Dev-Branches im Prod-Build)
