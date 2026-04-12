/**
 * Fetches AI-generated review summary from Google Places API (New).
 *
 * Requires "Places API (New)" enabled in Google Cloud Console.
 * Falls back gracefully to null if not available or not enabled.
 */
export async function fetchAiSummary(
  placeId: string,
): Promise<string | null> {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  )?.trim();
  if (!apiKey || !placeId) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'generativeSummary.overview.text,editorialSummary.text',
        },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      generativeSummary?: { overview?: { text?: string } };
      editorialSummary?: { text?: string };
    };

    // Prefer AI-generated summary, fall back to editorial
    return (
      data.generativeSummary?.overview?.text ??
      data.editorialSummary?.text ??
      null
    );
  } catch {
    // Places API (New) not enabled or network error — silent fallback
    return null;
  }
}
