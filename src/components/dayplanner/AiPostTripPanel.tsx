import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { POI } from '../../data/pois';
import type { Family, Settings } from '../../settings/types';
import { getTripConfig } from '../../settings/tripConfig';
import { generatePostTripAnalysis } from '../../lib/aiPostTripAnalysis';
import { isGeminiConfigured } from '../../lib/gemini';

interface Props {
  pois: POI[];
  families: Family[];
  settings: Settings;
  analysis: string;
  onSave: (analysis: string) => void | Promise<void>;
}

/**
 * #43 Post-Trip-Analyse: Gemini analysiert besuchte POIs + Favoriten +
 * Budget und schlägt 3-5 Dinge für den nächsten Trip in derselben Stadt vor.
 */
export function AiPostTripPanel({ pois, families, settings, analysis, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visitedCount = pois.filter((p) => p.visitStatus === 'visited').length;
  const canGenerate = isGeminiConfigured && visitedCount > 0;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await generatePostTripAnalysis({
        pois,
        families,
        tripConfig: getTripConfig(settings),
      });
      await onSave(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  };

  // Nichts zu zeigen wenn Gemini nicht konfiguriert
  if (!isGeminiConfigured) return null;

  const label = analysis ? 'Analyse aktualisieren' : 'Post-Trip-Analyse erzeugen';

  return (
    <div className="rounded-2xl bg-terracotta/8 px-4 py-3 text-sm text-ink">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            AI Post-Trip-Analyse
          </p>
          <p className="text-xs text-ink/45">
            Basierend auf besuchten Orten + Favoriten — was beim nächsten Mal?
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="flex flex-shrink-0 items-center gap-1 rounded-full bg-terracotta px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Analysiere…' : label}
        </button>
      </div>

      {visitedCount === 0 && !analysis && (
        <p className="mt-2 text-xs text-ink/60">
          Mindestens ein POI muss als <strong>✅ Besucht</strong> markiert sein, bevor eine Analyse erzeugt werden kann.
        </p>
      )}

      {error && (
        <div className="mt-2 rounded-2xl bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-3">
          <p className="whitespace-pre-line leading-6 text-sm">{analysis}</p>
        </div>
      )}
    </div>
  );
}
