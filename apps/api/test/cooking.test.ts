import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { createMockAI } from '../src/modules/ai/mock.js';
import type { RecipeAI } from '../src/modules/ai/provider.js';

let ai: RecipeAI;
let app: ReturnType<typeof createApp>;

async function generateRecipe() {
  const { body } = await request(app).post('/api/suggestions').send({});
  const res = await request(app).post('/api/recipes/generate').send({ suggestion: body.suggestions[0], servings: 2 });
  return res.body;
}

beforeEach(async () => {
  ai = createMockAI();
  app = createApp(openDatabase(':memory:'), { ai });
  await request(app).post('/api/inventory/quick-add').send({ text: 'poulet, riz, carottes' });
});

describe('préférences et basiques du placard', () => {
  it('renvoie les valeurs par défaut puis applique une modification partielle', async () => {
    const initial = await request(app).get('/api/preferences');
    expect(initial.body).toMatchObject({ servings: 2, hasStaples: true });
    const updated = await request(app).patch('/api/preferences').send({ servings: 4, avoid: ['coriandre'] });
    expect(updated.body).toMatchObject({ servings: 4, avoid: ['coriandre'], hasStaples: true });
    expect((await request(app).patch('/api/preferences').send({ servings: 40 })).status).toBe(400);
  });

  it('compte les basiques déclarés comme disponibles, sauf si on les désactive', async () => {
    const recipe = await generateRecipe();
    const sel = recipe.ingredients.find((i: { name: string }) => i.name === 'sel');
    expect(sel.status).toBe('available');

    await request(app).patch('/api/preferences').send({ hasStaples: false });
    const again = await generateRecipe();
    expect(again.ingredients.find((i: { name: string }) => i.name === 'sel').status).toBe('unknown');
  });

  it('transmet le profil à l’IA', async () => {
    await request(app).patch('/api/preferences').send({ instructions: 'Pas trop épicé', avoid: ['coriandre'] });
    const spy = vi.spyOn(ai, 'suggest');
    await request(app).post('/api/suggestions').send({});
    expect(spy.mock.calls[0]![0].preferences).toMatchObject({ instructions: 'Pas trop épicé', avoid: ['coriandre'] });
  });
});

describe('mode cuisine', () => {
  it('permet de mener plusieurs préparations en parallèle et de les reprendre', async () => {
    const recipe = await generateRecipe();
    const a = await request(app).post('/api/cooking').send({ recipe });
    const b = await request(app).post('/api/cooking').send({ recipe, servings: 4 });
    expect(a.status).toBe(201);
    expect(b.body.servings).toBe(4);

    await request(app).patch(`/api/cooking/${a.body.id}`).send({ currentStep: 2 });
    const active = await request(app).get('/api/cooking');
    expect(active.body).toHaveLength(2);
    expect(active.body.find((s: { id: number }) => s.id === a.body.id).currentStep).toBe(2);

    // L'étape ne peut pas dépasser la dernière.
    const capped = await request(app).patch(`/api/cooking/${a.body.id}`).send({ currentStep: 99 });
    expect(capped.body.currentStep).toBe(recipe.steps.length - 1);
  });

  it('termine une préparation (historique) ou l’abandonne', async () => {
    const recipe = await generateRecipe();
    const a = await request(app).post('/api/cooking').send({ recipe });
    const b = await request(app).post('/api/cooking').send({ recipe });

    const done = await request(app).post(`/api/cooking/${a.body.id}/finish`);
    expect(done.body.finishedAt).not.toBeNull();
    expect((await request(app).delete(`/api/cooking/${b.body.id}`)).status).toBe(204);

    expect((await request(app).get('/api/cooking')).body).toHaveLength(0);
    expect((await request(app).get('/api/cooking/history')).body).toHaveLength(1);
  });

  it('répond à une question sur l’étape en cours, avec le contexte de la recette', async () => {
    const recipe = await generateRecipe();
    const { body: session } = await request(app).post('/api/cooking').send({ recipe });
    const spy = vi.spyOn(ai, 'ask');

    const res = await request(app)
      .post(`/api/cooking/${session.id}/ask`)
      .send({ question: 'Je peux remplacer le riz ?', stepIndex: 1, history: [] });

    expect(res.status).toBe(200);
    expect(res.body.answer).toContain('Je peux remplacer le riz ?');
    expect(spy.mock.calls[0]![0]).toMatchObject({ stepIndex: 1, recipe: { title: recipe.title } });
    expect((await request(app).post(`/api/cooking/${session.id}/ask`).send({ question: '' })).status).toBe(400);
  });
});
