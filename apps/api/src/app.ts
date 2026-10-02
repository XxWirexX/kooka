import express from 'express';
import type { Db } from './db/index.js';
import { errorHandler } from './lib/http.js';
import { createInventoryRepository } from './modules/inventory/inventory.repository.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { createInventoryService } from './modules/inventory/inventory.service.js';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const inventory = createInventoryService(createInventoryRepository(db));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/inventory', inventoryRouter(inventory));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });
  app.use(errorHandler);
  return app;
}
