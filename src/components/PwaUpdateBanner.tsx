import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWA_ENABLED =
  import.meta.env.PROD && import.meta.env.VITE_DISABLE_PWA !== '1';

export function PwaUpdateBanner() {
  if (!PWA_ENABLED) return null;

  return <PwaUpdatePrompt />;
}

function PwaUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error('[PWA] service worker registration failed:', error);
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="border-b border-ocker/30 bg-ocker-light px-4 py-2 text-ink shadow-sm shadow-ink/5">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <RefreshCw className="h-4 w-4 flex-shrink-0 text-terracotta" />
        <p className="min-w-0 flex-1 text-sm font-medium">
          Neue Version verfügbar
        </p>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="flex-shrink-0 rounded-full bg-terracotta px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-ink/10 transition hover:bg-terracotta-dark"
        >
          Neu laden
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            setNeedRefresh(false);
          }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink/60 transition hover:bg-white/70 hover:text-ink"
          aria-label="Update-Hinweis schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
