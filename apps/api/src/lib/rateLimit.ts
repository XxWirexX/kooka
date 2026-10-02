import type { RequestHandler } from 'express';

/**
 * Limiteur en mémoire par adresse IP (fenêtre fixe). Suffisant pour une instance unique ;
 * remis à zéro au redémarrage.
 */
export function rateLimit(options: { windowMs: number; max: number; message: string }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, entry);
      if (hits.size > 10_000) hits.clear(); // garde-fou mémoire
    }
    entry.count++;
    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}
