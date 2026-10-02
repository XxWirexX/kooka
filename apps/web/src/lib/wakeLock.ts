import { useEffect } from 'react';

/** Garde l'écran allumé tant que le composant est affiché (mode cuisine), si le navigateur le permet. */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen');
          if (cancelled) await lock.release();
        }
      } catch {
        // refusé (batterie faible, navigateur) : sans gravité
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, []);
}
