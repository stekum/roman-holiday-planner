/**
 * Entfernt zusammenhaengende Blockwiederholungen die Gemini manchmal in thinking+response-
 * Parts produziert. Splittet an Doppel-Newlines, dedupliziert aufeinanderfolgende
 * identische Bloecke unter Erhalt der Reihenfolge. Referenz: Issue #169 — Briefing rendert
 * 3x denselben Absatz, Ursache liegt im joined response-text, nicht im Render.
 */
export function deduplicateParagraphs(text: string): string {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length <= 1) return text;

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const block of blocks) {
    // Normalisiere fuer Vergleich: whitespace-collapse + lowercase
    const fingerprint = block.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(block);
  }
  return unique.join('\n\n');
}
