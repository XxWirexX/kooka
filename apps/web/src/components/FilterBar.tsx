import { CUISINES, type SuggestionFilters } from '@kooka/shared';
import { Compass, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_FILTERS } from '../hooks/useSuggestions';

const TIMES = [
  { label: 'Peu importe', value: null },
  { label: '≤ 20 min', value: 20 },
  { label: '≤ 40 min', value: 40 },
  { label: '≤ 1 h', value: 60 },
];

interface Props {
  filters: SuggestionFilters;
  onChange: (filters: SuggestionFilters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const extraCount = (filters.cuisine ? 1 : 0) + (filters.ignoreInventory ? 1 : 0);
  const set = (patch: Partial<SuggestionFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${
            open || extraCount ? 'border-ink bg-ink text-cream' : 'border-line bg-surface'
          }`}
        >
          <SlidersHorizontal size={16} />
          Filtres{extraCount > 0 && ` · ${extraCount}`}
        </button>
        {TIMES.map((t) => (
          <Chip key={t.label} active={(filters.maxMinutes ?? null) === t.value} onClick={() => set({ maxMinutes: t.value })}>
            {t.label}
          </Chip>
        ))}
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Cuisine</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={!filters.cuisine} onClick={() => set({ cuisine: null })}>
              Toutes
            </Chip>
            {CUISINES.map((c) => (
              <Chip key={c} active={filters.cuisine === c} onClick={() => set({ cuisine: c })}>
                {c}
              </Chip>
            ))}
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <Compass size={20} className="shrink-0 text-tomato" />
            <span className="flex-1 text-sm">
              <span className="font-medium">Mode découverte</span>
              <span className="block text-muted">Des idées sans tenir compte de ton inventaire</span>
            </span>
            <input
              type="checkbox"
              checked={filters.ignoreInventory ?? false}
              onChange={(e) => set({ ignoreInventory: e.target.checked })}
              className="size-5 accent-tomato"
            />
          </label>

          {(extraCount > 0 || filters.maxMinutes) && (
            <button onClick={() => onChange(DEFAULT_FILTERS)} className="mt-4 text-sm font-medium text-tomato-dark">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'border-tomato bg-tomato-soft text-tomato-dark' : 'border-line bg-surface text-ink'
      }`}
    >
      {children}
    </button>
  );
}
