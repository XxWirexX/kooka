import { useEffect, useState, useSyncExternalStore } from 'react';
import { readJson, writeJson } from './storage';

/**
 * Minuteurs du mode cuisine. Ils reposent sur une heure de fin (et non un compte à rebours en mémoire) :
 * ils continuent donc de tourner quand on change de recette, de page, ou qu'on recharge l'app.
 */
export interface Timer {
  id: string;
  sessionId: number;
  step: number;
  label: string;
  endsAt: number;
  /** L'alarme a déjà sonné. */
  alerted: boolean;
}

const KEY = 'kooka:timers';
let timers: Timer[] = readJson<Timer[]>('local', KEY, []);
const listeners = new Set<() => void>();

function commit(next: Timer[]) {
  timers = next;
  writeJson('local', KEY, timers);
  listeners.forEach((l) => l());
}

export const timerStore = {
  start(t: Omit<Timer, 'id' | 'endsAt' | 'alerted'> & { minutes: number }) {
    const id = `${t.sessionId}-${t.step}`;
    const timer: Timer = { id, sessionId: t.sessionId, step: t.step, label: t.label, endsAt: Date.now() + t.minutes * 60_000, alerted: false };
    commit([...timers.filter((x) => x.id !== id), timer]);
  },
  stop(id: string) {
    commit(timers.filter((t) => t.id !== id));
  },
  stopSession(sessionId: number) {
    commit(timers.filter((t) => t.sessionId !== sessionId));
  },
  markAlerted(id: string) {
    commit(timers.map((t) => (t.id === id ? { ...t, alerted: true } : t)));
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTimers(): Timer[] {
  return useSyncExternalStore(subscribe, () => timers);
}

/** L'heure courante, rafraîchie chaque seconde tant qu'un minuteur tourne. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Fait sonner (et vibrer) les minuteurs arrivés à échéance. À monter une seule fois dans l'app. */
export function useTimerAlarms() {
  const list = useTimers();
  const now = useNow(list.some((t) => !t.alerted));
  useEffect(() => {
    for (const t of list) {
      if (!t.alerted && t.endsAt <= now) {
        timerStore.markAlerted(t.id);
        ring();
      }
    }
  }, [list, now]);
}

function ring() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch {
    // son indisponible (navigateur, autoplay bloqué) : la bannière visuelle suffit
  }
}
