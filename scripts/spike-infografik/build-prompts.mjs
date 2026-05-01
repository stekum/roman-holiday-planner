/**
 * Spike #260 — Prompt-Builder für Infografik-Karten.
 *
 * Wird vom generate-Script importiert. Drei Modi:
 *   - buildDayPrompt(trip, dayIndex): eine Tageskarte
 *   - buildTripPrompt(trip): Trip-Übersicht über alle Tage
 *   - STYLE_LOCK: gemeinsamer Style-Block für alle Modi
 */

export const STYLE_LOCK = `
STYLE — strict adherence required:
- Watercolor illustration in vintage travel-guide style
- Pastel color palette: soft pinks, sage greens, warm beiges, dusty blues
- Hand-drawn feel, illustrative, NEVER photorealistic
- Cherry blossom decorative accents in corners
- Compass rose top-right, decorative legend bottom-left
- Aged-paper background texture
- Hand-lettered title in elegant serif typography
- Mini-icons for stops (temples=torii, food=bowl, parks=tree, sightseeing=star)
- Dashed lines connect stops in walking order
- Layout: portrait orientation, 1024x1536 aspect
`.trim();

function stopLine(stop) {
  const tod = stop.timeSlot ? ` (${stop.timeSlot})` : '';
  const note = stop.note ? ` — ${stop.note}` : '';
  return `  • ${stop.name}${tod} [${stop.category}]${note}`;
}

export function buildDayPrompt(trip, dayIndex) {
  const day = trip.days[dayIndex];
  const stops = day.stops.map(stopLine).join('\n');

  return `${STYLE_LOCK}

CONTENT — design a single-day travel infographic:

Title: "${day.city} — Day ${day.dayNumber}: ${day.theme}"
Date: ${day.date}
Trip: ${trip.title}

Stops in order (walking-tour layout):
${stops}

Practical Tips footer (bottom of page, small text):
${trip.tips.slice(0, 3).map((t) => `  • ${t}`).join('\n')}

Currency: ${trip.currency}

Render the stops as connected dots on a stylized mini-map of ${day.city},
with the theme "${day.theme}" reflected in the visual mood.
Each stop labeled, each connected by dashed walking-paths.
`.trim();
}

export function buildTripPrompt(trip) {
  const dayBlocks = trip.days
    .map((d) => {
      const top = d.stops
        .slice(0, 3)
        .map((s) => s.name)
        .join(', ');
      return `Day ${d.dayNumber} (${d.city} — ${d.theme}): ${top}`;
    })
    .join('\n');

  return `${STYLE_LOCK}

CONTENT — design a multi-day trip overview infographic:

Title: "${trip.title}"
Subtitle: "${trip.destination} · ${trip.startDate} → ${trip.endDate}"

Trip overview — ${trip.days.length} days:
${dayBlocks}

Show a vertical timeline or sectioned layout with one mini-panel per day.
Each panel: day number, city, theme, top-3 stops, mini-icon.
Bottom: practical-tips strip with ${trip.tips.length} tips, currency=${trip.currency}.
`.trim();
}

export function buildStyleVariationPrompt(trip, dayIndex) {
  // Same content as Day-prompt, but explore alternative style direction
  const day = trip.days[dayIndex];
  const stops = day.stops.map(stopLine).join('\n');
  return `
STYLE — alternative direction:
- Modern flat-illustration style (Mucha-meets-Studio-Ghibli)
- Bold color blocks instead of watercolor washes
- Geometric shapes, strong outlines
- Limited palette: 4-5 colors max
- Editorial / magazine-cover feel
- Title in modern sans-serif

CONTENT — design a single-day travel infographic:

Title: "${day.city} — Day ${day.dayNumber}: ${day.theme}"
Date: ${day.date}
Trip: ${trip.title}

Stops in order:
${stops}

Show all stops, labeled, in walking-tour layout.
`.trim();
}
