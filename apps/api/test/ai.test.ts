import type { InventoryItem } from '@kooka/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { annotateIngredients, computeAvailability } from '../src/lib/availability.js';
import { createMockAI } from '../src/modules/ai/mock.js';
import type { RecipeAI } from '../src/modules/ai/provider.js';
import type { AiRecipe } from '../src/modules/ai/schemas.js';
import { finalizeRecipe } from '../src/modules/recipes/recipes.service.js';

const item = (name: string, stockLevel: InventoryItem['stockLevel'] = 'some'): InventoryItem => ({
  id: 1,
  name,
  quantity: null,
  unit: null,
  category: null,
  stockLevel,
  createdAt: '',
  updatedAt: '',
});
const ing = (name: string, extra: Partial<{ optional: boolean; staple: boolean; inventoryMatch: string | null }> = {}) => ({
  name,
  optional: false,
  staple: false,
  inventoryMatch: null,
  ...extra,
});

describe('disponibilité des ingrédients', () => {
  const inventory = [item('Poulet'), item('Carottes', 'low'), item('Citron vert', 'out')];

  it('distingue disponible, presque fini, épuisé et inconnu', () => {
    const result = annotateIngredients(
      [ing('blanc de poulet'), ing('carotte'), ing('citron vert'), ing('lait de coco')],
      inventory,
    );
    expect(result.map((r) => r.status)).toEqual(['available', 'low', 'missing', 'unknown']);
    expect(result[0]!.inventoryMatch).toBe('Poulet');
  });

  it("ignore une correspondance proposée par l'IA qui n'existe pas dans l'inventaire", () => {
    const [r] = annotateIngredients([ing('tofu', { inventoryMatch: 'Tofu fumé' })], inventory);
    expect(r).toMatchObject({ status: 'unknown', inventoryMatch: null });
  });

  it('ne compte ni les facultatifs ni les basiques', () => {
    const annotated = annotateIngredients(
      [ing('poulet'), ing('lait de coco'), ing('sel', { staple: true }), ing('coriandre', { optional: true })],
      inventory,
    );
    expect(computeAvailability(annotated)).toEqual({
      available: 1,
      required: 2,
      missing: [],
      unknown: ['lait de coco'],
    });
  });
});

describe('validation des recettes', () => {
  const base: AiRecipe = {
    title: 'Poulet mariné',
    emoji: '🍗',
    description: 'Un poulet tendre.',
    cuisine: 'Thaïlandaise',
    difficulty: 'easy',
    servings: 2,
    activeMinutes: 10,
    passiveMinutes: 0,
    ingredients: [
      { name: 'poulet', amount: 300, unit: 'g', grams: null, note: null, optional: false, staple: false, inventoryMatch: 'Poulet' },
      { name: 'sel', amount: null, unit: null, grams: null, note: 'une pincée', optional: false, staple: true, inventoryMatch: null },
    ],
    steps: [
      { title: 'Mariner', instruction: 'Laisse mariner.', minutes: 30, passive: true },
      { title: 'Préparer', instruction: 'Découpe.', minutes: 10, passive: false },
      { title: 'Cuire', instruction: 'Fais cuire.', minutes: 20, passive: false },
    ],
    tips: [' ', 'Astuce'],
  };

  it('rend les temps cohérents avec les étapes', () => {
    const r = finalizeRecipe(base, 2, [item('Poulet')]);
    expect(r).toMatchObject({ activeMinutes: 30, passiveMinutes: 30, totalMinutes: 60, tips: ['Astuce'] });
    expect(r.ingredients[0]!.status).toBe('available');
  });

  it('recalcule les quantités si le nombre de personnes ne correspond pas', () => {
    const r = finalizeRecipe(base, 4, []);
    expect(r.servings).toBe(4);
    expect(r.ingredients[0]!.amount).toBe(600);
  });

  it('refuse un ingrédient indispensable sans quantité', () => {
    const vague = structuredClone(base);
    vague.ingredients[0]!.amount = null;
    expect(() => finalizeRecipe(vague, 2, [])).toThrow(/Quantité manquante/);
  });
});

describe('API suggestions et recettes', () => {
  let ai: RecipeAI;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    ai = createMockAI();
    app = createApp(openDatabase(':memory:'), { ai });
    await request(app).post('/api/inventory/quick-add').send({ text: 'poulet, riz, carottes' });
  });

  it('renvoie 3 suggestions avec un indicateur de disponibilité', async () => {
    const res = await request(app).post('/api/suggestions').send({});
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toHaveLength(3);
    expect(res.body.suggestions[0].availability).toMatchObject({ available: 2, required: 2 });
  });

  it('met en cache quand le contexte ne change pas, et explore autre chose avec exclude', async () => {
    const spy = vi.spyOn(ai, 'suggest');
    const first = await request(app).post('/api/suggestions').send({});
    await request(app).post('/api/suggestions').send({});
    expect(spy).toHaveBeenCalledTimes(1);

    const titles = first.body.suggestions.map((s: { title: string }) => s.title);
    const more = await request(app).post('/api/suggestions').send({ exclude: titles });
    expect(spy).toHaveBeenCalledTimes(2);
    for (const s of more.body.suggestions) expect(titles).not.toContain(s.title);
  });

  it('relance une fois puis renvoie 502 si la réponse reste inexploitable', async () => {
    const spy = vi.spyOn(ai, 'suggest').mockResolvedValue({ suggestions: [] });
    const res = await request(app).post('/api/suggestions').send({});
    expect(res.status).toBe(502);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('génère une recette puis la sauvegarde dans le livre', async () => {
    const { body } = await request(app).post('/api/suggestions').send({});
    const s = body.suggestions[0];
    const recipe = await request(app).post('/api/recipes/generate').send({ suggestion: s, servings: 3 });
    expect(recipe.status).toBe(200);
    expect(recipe.body.servings).toBe(3);
    expect(recipe.body.totalMinutes).toBe(recipe.body.activeMinutes + recipe.body.passiveMinutes);

    const saved = await request(app).post('/api/cookbook').send({ recipe: recipe.body });
    expect(saved.status).toBe(201);
    const list = await request(app).get('/api/cookbook');
    expect(list.body).toHaveLength(1);
    expect((await request(app).delete(`/api/cookbook/${saved.body.id}`)).status).toBe(204);
  });
});
