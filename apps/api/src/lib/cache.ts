import { createHash } from 'node:crypto';

/** Petit cache mémoire avec expiration, pour éviter de rappeler l'IA quand le contexte n'a pas changé. */
export class TtlCache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  constructor(
    private ttlMs: number,
    private maxEntries = 200,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

export function hashKey(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
}

/** Relance une fois si l'IA renvoie une réponse inexploitable. */
export async function withRetry<T>(fn: () => Promise<T>, isRetryable: (err: unknown) => boolean): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRetryable(err)) throw err;
    console.warn('[ai] réponse invalide, nouvel essai :', err instanceof Error ? err.message : err);
    return fn();
  }
}
