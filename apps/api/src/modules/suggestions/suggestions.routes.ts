import { Router } from 'express';
import type { createSuggestionsService } from './suggestions.service.js';

export function suggestionsRouter(service: ReturnType<typeof createSuggestionsService>) {
  const router = Router();
  router.post('/', async (req, res) => {
    res.json(await service.suggest(req.body));
  });
  return router;
}
