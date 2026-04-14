import { Users } from 'lucide-react';
import type { Family } from '../../settings/types';

interface Props {
  families: Family[];
  myFamilyId: string;
  onChange: (id: string) => void;
}

export function MyFamilyEditor({ families, myFamilyId, onChange }: Props) {
  if (families.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-ink/5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-ink" />
        <h2
          className="text-xl text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ich gehöre zu…
        </h2>
      </div>
      <p className="mb-3 text-xs text-ink/50">
        Wähle deine Familie — alle Votes die du abgibst gelten dann für diese
        Familie. Pro Gerät speicherbar.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {families.map((fam) => {
          const active = fam.id === myFamilyId;
          return (
            <button
              key={fam.id}
              type="button"
              onClick={() => onChange(fam.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'text-white shadow-md'
                  : 'bg-cream text-ink/60 hover:bg-cream-dark'
              }`}
              style={active ? { backgroundColor: fam.color } : undefined}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: active ? '#fff' : fam.color }}
              />
              {fam.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
