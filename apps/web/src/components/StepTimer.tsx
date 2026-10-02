import { BellRing, Pause, Timer as TimerIcon } from 'lucide-react';
import { formatCountdown, timerStore, useNow, useTimers } from '../lib/timers';
import { formatMinutes } from '../lib/format';

interface Props {
  sessionId: number;
  step: number;
  minutes: number;
  label: string;
}

export function StepTimer({ sessionId, step, minutes, label }: Props) {
  const timer = useTimers().find((t) => t.sessionId === sessionId && t.step === step);
  const now = useNow(timer !== undefined);

  if (!timer) {
    return (
      <button
        onClick={() => timerStore.start({ sessionId, step, label, minutes })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-saffron/50 bg-saffron-soft/50 py-4 font-semibold text-ink"
      >
        <TimerIcon size={20} className="text-saffron" /> Lancer le minuteur · {formatMinutes(minutes)}
      </button>
    );
  }

  const remaining = timer.endsAt - now;
  if (remaining <= 0) {
    return (
      <button
        onClick={() => timerStore.stop(timer.id)}
        className="flex w-full animate-pulse items-center justify-center gap-2 rounded-2xl bg-tomato py-4 font-semibold text-cream"
      >
        <BellRing size={20} /> C'est prêt ! (toucher pour arrêter)
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-saffron-soft px-5 py-3">
      <span className="font-mono text-4xl font-semibold tabular-nums">{formatCountdown(remaining)}</span>
      <button
        onClick={() => timerStore.stop(timer.id)}
        className="flex items-center gap-1 rounded-full bg-surface px-4 py-2 text-sm font-semibold"
      >
        <Pause size={16} /> Arrêter
      </button>
    </div>
  );
}
