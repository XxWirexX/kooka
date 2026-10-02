import { DIFFICULTY_LABELS, type Suggestion } from '@kooka/shared';
import { Clock, Gauge } from 'lucide-react';
import { Link } from 'react-router';
import { formatMinutes } from '../lib/format';

const TINTS = ['bg-tomato-soft', 'bg-basil-soft', 'bg-saffron-soft'];

export function SuggestionCard({ suggestion: s, index, discovery }: { suggestion: Suggestion; index: number; discovery: boolean }) {
  const { available, required, missing, unknown } = s.availability;
  const complete = required > 0 && available === required;

  return (
    <Link
      to={`/idee/${s.id}`}
      className="block overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition active:scale-[0.99]"
    >
      <div className={`flex items-center gap-4 p-4 ${TINTS[index % TINTS.length]}`}>
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface/70 text-4xl" aria-hidden>
          {s.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{s.cuisine}</p>
          <h3 className="font-display text-lg leading-tight font-semibold">{s.title}</h3>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <p className="text-sm">{s.pitch}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1">
            <Clock size={15} /> {formatMinutes(s.totalMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={15} /> {DIFFICULTY_LABELS[s.difficulty]}
          </span>
          {!discovery && required > 0 && (
            <span className={`font-medium ${complete ? 'text-basil' : 'text-ink'}`}>
              {available}/{required} ingrédients
            </span>
          )}
        </div>

        {!discovery && (
          <p className="rounded-xl bg-cream px-3 py-2 text-sm">
            <span aria-hidden>💡 </span>
            {s.reason}
          </p>
        )}

        {!discovery && (missing.length > 0 || unknown.length > 0) && (
          <p className="text-xs text-muted">
            {missing.length > 0 && <>Épuisé : {missing.join(', ')}. </>}
            {unknown.length > 0 && <>Pas dans ton inventaire : {unknown.join(', ')}.</>}
          </p>
        )}
      </div>
    </Link>
  );
}

export function SuggestionSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center gap-4 bg-line/40 p-4">
        <div className="size-16 rounded-2xl bg-line" />
        <div className="h-5 w-40 rounded bg-line" />
      </div>
      <div className="space-y-2 p-4">
        <div className="h-4 w-full rounded bg-line/70" />
        <div className="h-4 w-2/3 rounded bg-line/70" />
      </div>
    </div>
  );
}
