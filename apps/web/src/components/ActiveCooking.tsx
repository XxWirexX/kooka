import type { CookingSession } from '@kooka/shared';
import { BellRing } from 'lucide-react';
import { Link } from 'react-router';
import { useActiveCooking } from '../hooks/useCooking';
import { formatCountdown, useNow, useTimers } from '../lib/timers';

/** Puces des préparations en cours, avec leur minuteur : pour passer d'une recette à l'autre. */
export function CookingChips({ currentId, className = '' }: { currentId?: number; className?: string }) {
  const { data: sessions = [] } = useActiveCooking();
  const timers = useTimers();
  const now = useNow(timers.length > 0);
  if (sessions.length === 0 || (currentId !== undefined && sessions.length === 1)) return null;

  return (
    <div className={`flex gap-2 overflow-x-auto [scrollbar-width:none] ${className}`}>
      {sessions.map((s) => (
        <Chip key={s.id} session={s} active={s.id === currentId} now={now} timers={timers.filter((t) => t.sessionId === s.id)} />
      ))}
    </div>
  );
}

function Chip({
  session: s,
  active,
  now,
  timers,
}: {
  session: CookingSession;
  active: boolean;
  now: number;
  timers: ReturnType<typeof useTimers>;
}) {
  const next = [...timers].sort((a, b) => a.endsAt - b.endsAt)[0];
  const ringing = next && next.endsAt <= now;
  return (
    <Link
      to={`/cuisine/${s.id}`}
      replace={active}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
        ringing
          ? 'animate-pulse border-tomato bg-tomato text-cream'
          : active
            ? 'border-ink bg-ink text-cream'
            : 'border-line bg-surface'
      }`}
    >
      <span aria-hidden>{s.recipe.emoji}</span>
      <span className="max-w-32 truncate font-medium">{s.recipe.title}</span>
      <span className="opacity-70">
        {s.currentStep + 1}/{s.recipe.steps.length}
      </span>
      {next &&
        (ringing ? (
          <BellRing size={14} />
        ) : (
          <span className="font-mono tabular-nums">⏱ {formatCountdown(next.endsAt - now)}</span>
        ))}
    </Link>
  );
}
