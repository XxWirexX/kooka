import { Router } from 'express';
import { z } from 'zod';
import type { createCookbookService } from './cookbook.service.js';

const idParam = z.coerce.number().int().positive();

export function cookbookRouter(service: ReturnType<typeof createCookbookService>) {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(service.list());
  });
  router.get('/:id', (req, res) => {
    res.json(service.get(idParam.parse(req.params.id)));
  });
  router.post('/', (req, res) => {
    res.status(201).json(service.save(req.body));
  });
  router.delete('/:id', (req, res) => {
    service.remove(idParam.parse(req.params.id));
    res.status(204).end();
  });
  return router;
}
