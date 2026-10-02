import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db/index.js';
import { errorHandler } from './lib/http.js';
import { createKitchen } from './lib/kitchen.js';
import { rateLimit } from './lib/rateLimit.js';
import type { RecipeAI } from './modules/ai/index.js';
import { createAuth, type AuthConfig } from './modules/auth/auth.js';
import { cookbookRouter } from './modules/cookbook/cookbook.routes.js';
import { createCookbookService } from './modules/cookbook/cookbook.service.js';
import { cookingRouter } from './modules/cooking/cooking.routes.js';
import { createCookingService } from './modules/cooking/cooking.service.js';
import { createInventoryRepository } from './modules/inventory/inventory.repository.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { createInventoryService } from './modules/inventory/inventory.service.js';
import { preferencesRouter } from './modules/preferences/preferences.routes.js';
import { createPreferencesService } from './modules/preferences/preferences.service.js';
import { recipesRouter } from './modules/recipes/recipes.routes.js';
import { createRecipesService } from './modules/recipes/recipes.service.js';
import { suggestionsRouter } from './modules/suggestions/suggestions.routes.js';
import { createSuggestionsService } from './modules/suggestions/suggestions.service.js';

export interface AppOptions {
  ai: RecipeAI;
  auth?: AuthConfig;
  /** Nombre maximum d'appels IA par heure (garde-fou contre une boucle ou un abus). */
  aiCallsPerHour?: number;
  /** Dossier du front compilé à servir (production). */
  webDist?: string;
  /** Derrière un reverse proxy (Caddy, nginx) : IP et HTTPS réels lus dans les en-têtes. */
  trustProxy?: boolean;
}

export function createApp(db: Db, options: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', 1);
  app.use(express.json({ limit: '200kb' }));

  const auth = createAuth(options.auth ?? { secureCookie: false });
  const inventoryRepo = createInventoryRepository(db);
  const preferences = createPreferencesService(db);
  const kitchen = createKitchen(inventoryRepo, preferences);
  const aiLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: options.aiCallsPerHour ?? 60,
    message: "Limite d'appels IA atteinte pour cette heure",
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', auth.router);
  app.use('/api', auth.guard);

  app.use('/api/inventory', inventoryRouter(createInventoryService(inventoryRepo)));
  app.use('/api/preferences', preferencesRouter(preferences));
  app.use('/api/suggestions', aiLimit, suggestionsRouter(createSuggestionsService(options.ai, kitchen)));
  app.use('/api/recipes', aiLimit, recipesRouter(createRecipesService(options.ai, kitchen)));
  app.use('/api/cooking/:id/ask', aiLimit);
  app.use('/api/cookbook', cookbookRouter(createCookbookService(db, kitchen)));
  app.use('/api/cooking', cookingRouter(createCookingService(db, options.ai)));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  // En production, l'API sert aussi le front compilé (une seule URL, un seul serveur).
  if (options.webDist && existsSync(join(options.webDist, 'index.html'))) {
    app.use(express.static(options.webDist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(options.webDist!, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
