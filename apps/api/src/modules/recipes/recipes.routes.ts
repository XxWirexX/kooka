import { Router } from 'express';
import type { createRecipesService } from './recipes.service.js';

export function recipesRouter(service: ReturnType<typeof createRecipesService>) {
  const router = Router();
  router.post('/generate', async (req, res) => {
    res.json(await service.generate(req.body));
  });
  return router;
}
