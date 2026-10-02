import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { AiOutputError } from '../modules/ai/provider.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} introuvable`);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Données invalides', issues: z.flattenError(err).fieldErrors });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof AiOutputError) {
    res.status(502).json({ error: "L'IA a renvoyé une réponse incohérente, réessaie" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne' });
};
