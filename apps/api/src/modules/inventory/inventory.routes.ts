import { quickAddSchema } from '@kooka/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { InventoryService } from './inventory.service.js';

const idParam = z.coerce.number().int().positive();

export function inventoryRouter(service: InventoryService) {
  const router = Router();

  router.get('/', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(service.list(search));
  });

  router.post('/', (req, res) => {
    const { item, created } = service.add(req.body);
    res.status(created ? 201 : 200).json(item);
  });

  router.post('/quick-add', (req, res) => {
    const { text } = quickAddSchema.parse(req.body);
    res.status(201).json(service.quickAdd(text));
  });

  router.patch('/:id', (req, res) => {
    res.json(service.update(idParam.parse(req.params.id), req.body));
  });

  router.delete('/:id', (req, res) => {
    service.remove(idParam.parse(req.params.id));
    res.status(204).end();
  });

  return router;
}
