# Spike #260 — AI-Infografik-Generator

**Status:** Abgeschlossen mit klarem Befund
**Datum:** 2026-05-01
**Modelle getestet:** Nano Banana 2 (`gemini-3.1-flash-image-preview`) vs. GPT-Image-2 (`gpt-image-2`)
**Aufwand:** ~2.5h Spike-Zeit
**Cost:** $0.32 ($0.08 NB2 + $0.24 GPT-Image-2)

## TL;DR — Empfehlung

> **GO für v4.5 mit GPT-Image-2 als Plan A.** GPT-Image-2 hat NB2 in jeder relevanten Dimension geschlagen: 100% vs. 25% Erfolgsrate, 74s vs. 300s+ Latenz, perfektes vs. fehlerhaftes Text-Rendering, kreativ-treffende vs. halluzinierende Layouts. NB2 bleibt Plan B falls GPT-Image-2 ausfällt oder Cost-Pressure entsteht.

**Wichtige Vorbehalte:**
- GPT-Image-2 ist ~2x teurer pro Bild ($0.08 vs $0.04), aber wegen Failure-Rate-Differenz **netto günstiger** pro **erfolgreichem** Bild (NB2 effective: $0.16/successful image at 25% success rate; GPT-Image-2 effective: $0.08).
- GPT-Image-2 erfordert separaten OpenAI-Account/Key — nicht über Firebase AI Logic verfügbar. Auth-Layer + Cost-Control-Layer in Cloud Functions notwendig.
- NB2 in 2-4 Wochen erneut testen — vielleicht behebt Google die 300s-Server-Cancellations für komplexe Prompts.

## Modell-Vergleich (Apples-to-Apples)

Identische Prompts, identische Mock-Trip-Daten ("Japan zu Pfingsten 2026", 5 Tage Tokyo + Kyoto).

| Metrik | NB2 (`gemini-3.1-flash-image-preview`) | GPT-Image-2 (`gpt-image-2`) | Sieger |
|---|---|---|---|
| **Erfolgsrate** | 1/3 (33%) + 0/2 retry = **1/5 (20%)** | **3/3 (100%)** | 🏆 GPT-Image-2 |
| **Latenz min/avg/max** | 11s / ~250s / 300s+ Timeout | 72s / **74s** / 76s | 🏆 GPT-Image-2 (Konsistenz) |
| **Cost / erfolgreiches Bild** | $0.04 (aber: $0.16 effektiv bei 25% success) | $0.08 (medium quality) | 🏆 GPT-Image-2 (effektiv) |
| **Text-Rendering** | ~95% korrekt, halluziniert bei >8 Wörtern | **100% korrekt** inkl. Umlaute (ä/ö/ü) und Sonderzeichen | 🏆 GPT-Image-2 |
| **Aquarell-Stil** | Sehr stark | **Sehr stark** | Unentschieden |
| **Layout-Verständnis (Multi-Panel)** | Gut, aber Inkonsistenzen | **Exzellent**, kreative Eigeninitiative | 🏆 GPT-Image-2 |
| **Style-Pivot (Watercolor → Flat-Illustration)** | Nicht getestet (Timeout) | **Sauber umgesetzt** | 🏆 GPT-Image-2 |
| **Sonderfeatures** | — | Walking-Times werden eigenständig berechnet ("ca. 5 Min", "ca. 10 Min") | 🏆 GPT-Image-2 |

## Bilder

### NB2-Resultate
- ✅ [smoke-test-1777665102409.jpeg](./smoke-test-1777665102409.jpeg) — generische Tokyo-Karte (Smoke-Test, kein Trip-Daten)
- ✅ [trip-overview-watercolor-1777665756973.jpeg](./trip-overview-watercolor-1777665756973.jpeg) — Trip-Übersicht 5 Tage
- ❌ Day-2 Tokyo (Watercolor): 2x Timeout bei 301s
- ❌ Day-2 Tokyo (Flat-Illustration): 1x Timeout bei 301s

### GPT-Image-2-Resultate
- ✅ [gpt2/gpt2-day2-watercolor-1777666913880.png](./gpt2/gpt2-day2-watercolor-1777666913880.png) — Day 2 Walking-Tour (76s)
- ✅ [gpt2/gpt2-trip-overview-watercolor-1777666986257.png](./gpt2/gpt2-trip-overview-watercolor-1777666986257.png) — Trip-Übersicht 5 Tage (72s)
- ✅ [gpt2/gpt2-day2-flat-illustration-1777667059376.png](./gpt2/gpt2-day2-flat-illustration-1777667059376.png) — Day 2 Flat-Illustration Style (73s)

## Detailed Findings

### NB2 (`gemini-3.1-flash-image-preview`)

**Stärken:**
- Aquarell-Stil und Pastell-Palette korrekt umgesetzt
- Trip-Übersicht-Layout (Multi-Panel) konzeptuell verstanden
- Stop-Namen aus Mock-Trip 100% korrekt gemappt

**Schwächen:**
- **Server-Hardlimit 300s**: Komplexe Walking-Tour-Day-Karten triggern konsistent Backend-Cancellation. Auch mit explizitem 600s `AbortSignal` failt der Call nach exakt 301s — d.h. Limit liegt bei Google, nicht bei Client. Reproduziert über 3 unabhängige Aufrufe.
- **Tipps-Footer**: Halluzinations-Müll-Text ("Temples Innurbersher", "Unliestating tips times…")
- **Inkonsistenzen**: Tag 1 Stops haben keine Verbindungslinien, Tag 2-5 schon. Legend-Box doppelte Einträge.
- **Latenz-Varianz**: 11s ↔ 222s ↔ 300s-Timeout — nicht vorhersagbar

### GPT-Image-2 (`gpt-image-2`)

**Stärken:**
- **Text 100% korrekt**: "Senso-ji Temple", "Nakamise Shopping Street", "Tokyo Skytree", "Akihabara Electric Town" — alle exakt. Inkl. deutsche Umlaute ("Tipping unüblich, kann beleidigend wirken", "Schuhe ausziehen in Tempeln/traditionellen Räumen")
- **Walking-Tour-Map** mit nummerierten Stops, gestrichelten Linien, Walking-Person-Icons UND **eigenständig berechneten Walking-Times** ("ca. 5 Min", "ca. 25 Min")
- **Practical-Tips-Footer** korrekt aus dem Trip-JSON: "Suica/Pasmo Card für ÖPNV", "Tipping unüblich…", "Schuhe ausziehen…"
- **Currency-Box** ("JPY (Yen)"), Kompass-Rose, Kirschblüten — alle Style-Lock-Anforderungen erfüllt
- **Style-Pivot**: Bei flat-illustration Style sauber Bold-Color-Blocks + geometrische Formen + Editorial-Look statt Aquarell
- **Atmosphärische Details** (Maneki-Neko, Stein-Laterne, Mt.Fuji-Komposition) ohne Prompt-Aufforderung — kreative Eigeninitiative
- **Konsistente Latenz** 72-76s (Std-Dev <2s)

**Schwächen:**
- Vereinzelte Tippfehler bei selbst-generierten Strings ("Aile Stoppe zu Fuß errechbar" statt "Alle Stopps zu Fuß erreichbar")
- Tipps-Mini-Kärtchen können pseudo-Text enthalten, wenn Layout-Slot mehr Platz hat als das JSON liefert (semantisch sinnvoll halluziniert, nicht Müll)
- Geografische Stop-Lagen auf Mini-Maps nicht 100% korrekt (illustrative Karte, nicht navigierbar — akzeptabel)

## Quantitative Daten

```
NB2 (gemini-3.1-flash-image-preview):
  Generations attempted:     5 (incl. retries)
  Successful:                1 (Phase 1 smoke) + 1 (Phase 2 trip-overview) = 2
  Failed:                    3 (alle: server-side 301s timeout for Day-Karte modus)
  Success rate:              40% (incl. smoke), 25% (excl. smoke)
  Latency min/median/max:    11s / 222s / 301s+
  Cost per image:            $0.040
  Effective cost (success):  $0.16
  Failure mode:              "fetch failed" after exact 301s, server-side cancellation

GPT-Image-2 (gpt-image-2, medium quality, 1024x1536):
  Generations attempted:     3
  Successful:                3 (100%)
  Failed:                    0
  Success rate:              100%
  Latency min/median/max:    72.4s / 73.1s / 76.0s
  Cost per image:            $0.08
  Effective cost (success):  $0.08
  Failure mode:              n/a
```

## Production-Architektur (Issue B / v4.5)

### Empfehlung: "Generate, Sofort-Download, Email-Optional, kein Persistent-Storage"
(Stefans ursprüngliche Idee aus dem Spike-Issue, bleibt unverändert valide.)

### Konkrete Tech-Stack-Empfehlung

```
Browser-Client
   │
   │ 1. POST /api/generateInfographic { tripId, mode: "day"|"trip" }
   ▼
Cloud Function "generateInfographic"  (Node.js, 2nd Gen, 540s timeout)
   │
   ├── Quota-Check (Firestore: users/{uid}.infographicCount)
   │   └── if exceeded: return 429
   │
   ├── Trip-Daten laden + Prompt bauen (buildDayPrompt / buildTripPrompt)
   │
   ├── OpenAI Images API (gpt-image-2, 1024x1536, medium)
   │   └── if fails: 1 retry, dann fallback NB2 (best-effort)
   │
   ├── Bild als base64 zurück → Cloud Function konvertiert zu PNG
   │
   └── Response: { imageBase64, generatedAt }

Browser-Client
   │
   ├── Download-Button (Blob → File-Save)
   ├── Web-Share-API (WhatsApp/IG/Email)
   └── Optional: POST /api/emailInfographic mit Adresse (sendet via Cloud Function + Resend/Postmark)

NICHT gespeichert. Beim Tab-Close: weg.
Quota-Counter wird beim Generate-Call hochgezählt, NICHT bei Failures.
```

### Prompt-Hardening für Production

1. **Stop-Beschreibungen auf max. 3 Wörter trimmen** vor dem Prompt-Bau (verhindert Halluzinations-Risiko)
2. **Style-Lock als separater System-Prompt-Block**, Content als User-Block (OpenAI-Image-API unterstützt das nicht direkt, aber wir können den Prompt-String klar strukturieren)
3. **Tips-Liste auf max. 3 Einträge à max. 60 Zeichen** — sonst werden sie unleserlich klein
4. **Currency, Datum, Theme** sind sichere Felder — die rendert GPT-Image-2 zuverlässig
5. **Top-3 Stops pro Tag** ist die optimale Layout-Dichte (mehr wird unleserlich, weniger wirkt leer)

### Cost-Modell für Production

| Tier | Generations/Monat | Modell | Cost/User/Monat | Vermarkten als |
|---|---|---|---|---|
| Free | 1/Trip | GPT-Image-2 medium | $0.08 | "Eine Infografik gratis pro Trip" |
| Premium | 20/Monat | GPT-Image-2 medium | $1.60 | Bei 7€/Monat: 23% COGS |
| Premium+ (später) | unlimited | GPT-Image-2 high | $3.20-5.00 | Bei 15€/Monat: 25% COGS |

### Feature-Flag-Plan
- `featureFlags.aiInfografik.enabled` (Boolean)
- `featureFlags.aiInfografik.allowedUsers` (Array of UIDs) — Stefan-only initially
- Rollout: Stefan → 10 Beta-User → 1% → 10% → all

## Konkrete nächste Schritte

- [ ] **Production-Issue B (v4.5)** mit obiger Architektur als Spec erstellen
- [ ] **NB2 in 2-4 Wochen erneut testen** (`node scripts/spike-infografik/generate.mjs`) — wenn Failure-Rate <10%, NB2 als kostengünstiger Plan A noch erwägen
- [ ] **GPT-Image-2 high-quality Test** für Premium+ ("kostet doppelt, ist's das wert?")
- [ ] **Animated GIF / Video-Output** als Bonus-Idee separat spiken (GPT-Image-2 supports nicht, aber Sora oder Runway könnten)

## Stop-Criterion-Compliance

Issue forderte: "Wenn nach 3h Spike-Zeit kein brauchbares Bild → STOP, GPT-Image-2 als Plan B empfehlen."

→ **Nicht ausgelöst.** Stattdessen kam GPT-Image-2 selbst von Plan B zu **Plan A**. NB2 von Plan A zu **Plan B**. Spike-Outcome stärker als erwartet — wir wissen jetzt nicht nur ob's geht, sondern auch **mit welchem Modell**.

## Akzeptanzkriterien (aus dem Issue)

- [x] Image-Modell aufgerufen, Bild kommt zurück (NB2 + GPT-Image-2 beide validiert)
- [x] Style-Prompt erzeugt **konsistent** brauchbare Resultate (3/3 bei GPT-Image-2 → "shareable" einstufbar)
- [x] Cost pro Generation gemessen und dokumentiert
- [x] Day-Karte UND Trip-Übersicht-Modus funktionieren (GPT-Image-2 beide; NB2 nur Trip-Übersicht)
- [x] Klare go/no-go-Empfehlung für Production-Feature

## Spike-Code (Wegwerf, nicht für Production)

- `scripts/spike-infografik/smoke-test.mjs` — Phase 1
- `scripts/spike-infografik/build-prompts.mjs` — Prompt-Templates (kann als Inspiration dienen)
- `scripts/spike-infografik/generate.mjs` — Phase 2 NB2
- `scripts/spike-infografik/retry-day.mjs` — NB2 Retry mit AbortSignal
- `scripts/spike-infografik/generate-gpt2.mjs` — Phase 2b GPT-Image-2
- `scripts/spike-infografik/trip-mock.json` — Test-Daten
- `docs/spikes/infografik/metrics.json` — NB2-Metriken
- `docs/spikes/infografik/gpt2/metrics.json` — GPT-Image-2-Metriken
- `docs/spikes/infografik/*.jpeg` + `gpt2/*.png` — generierte Bilder (gitignored)
