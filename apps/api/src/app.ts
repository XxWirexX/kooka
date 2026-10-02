import express from 'express';
import type { Db } from './db/index.js';
import { errorHandler } from './lib/http.js';
import type { RecipeAI } from './modules/ai/index.js';
import { cookbookRouter } from './modules/cookbook/cookbook.routes.js';
import { createCookbookService } from './modules/cookbook/cookbook.service.js';
import { createInventoryRepository } from './modules/inventory/inventory.repository.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { createInventoryService } from './modules/inventory/inventory.service.js';
import { recipesRouter } from './modules/recipes/recipes.routes.js';
import { createRecipesService } from './modules/recipes/recipes.service.js';
import { suggestionsRouter } from './modules/suggestions/suggestions.routes.js';
import { createSuggestionsService } from './modules/suggestions/suggestions.service.js';

export function createApp(db: Db, deps: { ai: RecipeAI }) {
  const app = express();
  app.use(express.json({ limit: '200kb' }));

  const inventoryRepo = createInventoryRepository(db);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/inventory', inventoryRouter(createInventoryService(inventoryRepo)));
  app.use('/api/suggestions', suggestionsRouter(createSuggestionsService(deps.ai, inventoryRepo)));
  app.use('/api/recipes', recipesRouter(createRecipesService(deps.ai, inventoryRepo)));
  app.use('/api/cookbook', cookbookRouter(createCookbookService(db, inventoryRepo)));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });
  app.use(errorHandler);
  return app;
}
