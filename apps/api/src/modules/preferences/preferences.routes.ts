import { Router } from 'express';
import type { PreferencesService } from './preferences.service.js';

export function preferencesRouter(service: PreferencesService) {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(service.get());
  });
  router.patch('/', (req, res) => {
    res.json(service.update(req.body));
  });
  return router;
}
