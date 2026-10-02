import { Router } from 'express';
import { z } from 'zod';
import type { createCookingService } from './cooking.service.js';

const idParam = z.coerce.number().int().positive();

export function cookingRouter(service: ReturnType<typeof createCookingService>) {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(service.active());
  });
  router.get('/history', (_req, res) => {
    res.json(service.history());
  });
  router.get('/:id', (req, res) => {
    res.json(service.get(idParam.parse(req.params.id)));
  });
  router.post('/', (req, res) => {
    res.status(201).json(service.start(req.body));
  });
  router.patch('/:id', (req, res) => {
    res.json(service.update(idParam.parse(req.params.id), req.body));
  });
  router.post('/:id/finish', (req, res) => {
    res.json(service.finish(idParam.parse(req.params.id)));
  });
  router.post('/:id/ask', async (req, res) => {
    res.json(await service.ask(idParam.parse(req.params.id), req.body));
  });
  router.delete('/:id', (req, res) => {
    service.remove(idParam.parse(req.params.id));
    res.status(204).end();
  });
  return router;
}
