import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(openDatabase(':memory:'));
});

describe('inventaire', () => {
  it('ajoute un ingrédient avec seulement son nom', async () => {
    const res = await request(app).post('/api/inventory').send({ name: '  Carottes ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Carottes',
      quantity: null,
      unit: null,
      category: null,
      stockLevel: 'some',
    });
  });

  it('refuse un nom vide', async () => {
    const res = await request(app).post('/api/inventory').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.issues.name).toBeDefined();
  });

  it('ne crée pas de doublon et réapprovisionne un ingrédient épuisé', async () => {
    const first = await request(app).post('/api/inventory').send({ name: 'carotte', stockLevel: 'out' });
    const again = await request(app).post('/api/inventory').send({ name: 'Carottes' });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(again.body.stockLevel).toBe('some');
    const list = await request(app).get('/api/inventory');
    expect(list.body).toHaveLength(1);
  });

  it('ajout rapide de plusieurs ingrédients séparés par des virgules', async () => {
    const res = await request(app)
      .post('/api/inventory/quick-add')
      .send({ text: 'poulet, riz,  sauce soja, Riz ,' });
    expect(res.status).toBe(201);
    expect(res.body.map((i: { name: string }) => i.name)).toEqual(['poulet', 'riz', 'sauce soja']);
  });

  it('modifie les champs facultatifs et permet de les effacer', async () => {
    const { body: item } = await request(app).post('/api/inventory').send({ name: 'Lait' });
    const updated = await request(app)
      .patch(`/api/inventory/${item.id}`)
      .send({ quantity: 1, unit: 'L', category: 'Produits laitiers', stockLevel: 'low' });
    expect(updated.body).toMatchObject({ quantity: 1, unit: 'L', stockLevel: 'low' });

    const cleared = await request(app)
      .patch(`/api/inventory/${item.id}`)
      .send({ quantity: null, unit: '' });
    expect(cleared.body).toMatchObject({ quantity: null, unit: null, category: 'Produits laitiers' });
  });

  it('refuse de renommer vers un ingrédient existant', async () => {
    await request(app).post('/api/inventory').send({ name: 'Oignon' });
    const { body: ail } = await request(app).post('/api/inventory').send({ name: 'Ail' });
    const res = await request(app).patch(`/api/inventory/${ail.id}`).send({ name: 'oignons' });
    expect(res.status).toBe(409);
  });

  it('recherche sans tenir compte des accents ni de la casse', async () => {
    await request(app).post('/api/inventory/quick-add').send({ text: 'Crème fraîche, céleri, poulet' });
    const res = await request(app).get('/api/inventory').query({ search: 'CREME' });
    expect(res.body.map((i: { name: string }) => i.name)).toEqual(['Crème fraîche']);
  });

  it('supprime un ingrédient', async () => {
    const { body: item } = await request(app).post('/api/inventory').send({ name: 'Tofu' });
    expect((await request(app).delete(`/api/inventory/${item.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/inventory/${item.id}`)).status).toBe(404);
  });
});
