import { ChevronRight, Inbox } from 'lucide-react';

interface Props {
  count: number;
  onClick: () => void;
}

export function InboxBanner({ count, onClick }: Props) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-3xl border-2 border-terracotta/30 bg-terracotta/5 p-4 text-left transition hover:bg-terracotta/10"
    >
      <div className="rounded-full bg-terracotta/15 p-2.5 text-terracotta">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-ink">
          {count === 1
            ? '1 Ort wartet auf Verortung'
            : `${count} Orte warten auf Verortung`}
        </p>
        <p className="text-xs text-ink/60">
          Manuell oder via Instagram ohne Koordinaten hinzugefügt
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-terracotta" />
    </button>
  );
}
