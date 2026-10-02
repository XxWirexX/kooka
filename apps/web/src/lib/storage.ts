import { useEffect, useState } from 'react';

/** Accès au stockage navigateur tolérant aux erreurs (navigation privée, stockage bloqué…). */
export function readJson<T>(storage: 'local' | 'session', key: string, fallback: T): T {
  try {
    const raw = (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(storage: 'local' | 'session', key: string, value: unknown) {
  try {
    (storage === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible : on garde simplement l'état en mémoire
  }
}

export function useStoredState<T>(storage: 'local' | 'session', key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readJson(storage, key, initial));
  useEffect(() => writeJson(storage, key, value), [storage, key, value]);
  return [value, setValue] as const;
}
