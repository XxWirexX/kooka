import { recipeRequestSchema, type InventoryItem, type Recipe } from '@kooka/shared';
import { annotateIngredients } from '../../lib/availability.js';
import { TtlCache, hashKey, withRetry } from '../../lib/cache.js';
import { AiOutputError, type RecipeAI } from '../ai/index.js';
import type { AiRecipe } from '../ai/schemas.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';

export function createRecipesService(ai: RecipeAI, inventoryRepo: InventoryRepository) {
  const cache = new TtlCache<Recipe>(24 * 60 * 60 * 1000);

  return {
    async generate(input: unknown): Promise<Recipe> {
      const req = recipeRequestSchema.parse(input);
      const ignoreInventory = req.ignoreInventory ?? false;
      const inventory = inventoryRepo.list();

      const key = hashKey({
        suggestion: req.suggestion,
        servings: req.servings,
        inventory: ignoreInventory ? null : inventory.map((i) => [i.name, i.stockLevel, i.quantity, i.unit]),
      });
      const cached = cache.get(key);
      if (cached) return { ...cached, ingredients: annotateIngredients(cached.ingredients, inventory) };

      const recipe = await withRetry(
        async () => {
          const raw = await ai.recipe({
            inventory: ignoreInventory ? [] : inventory,
            suggestion: req.suggestion,
            servings: req.servings,
            ignoreInventory,
          });
          return finalizeRecipe(raw, req.servings, inventory);
        },
        (err) => err instanceof AiOutputError,
      );
      cache.set(key, recipe);
      return recipe;
    },
  };
}

/**
 * Valide et rend cohérente une recette générée :
 * structure minimale, quantités exploitables, temps actif / passif / total cohérents.
 */
export function finalizeRecipe(raw: AiRecipe, servings: number, inventory: InventoryItem[]): Recipe {
  if (raw.ingredients.length < 2) throw new AiOutputError('Trop peu d’ingrédients');
  if (raw.steps.length < 2) throw new AiOutputError('Trop peu d’étapes');

  const ingredients = raw.ingredients.map((i) => ({
    ...i,
    name: i.name.trim(),
    amount: positiveOrNull(i.amount),
    grams: positiveOrNull(i.grams),
    unit: i.unit?.trim() || null,
    note: i.note?.trim() || null,
  }));
  const vague = ingredients.find((i) => !i.optional && i.amount === null && i.grams === null && !i.note);
  if (vague) throw new AiOutputError(`Quantité manquante pour « ${vague.name} »`);

  const steps = raw.steps.map((s) => ({
    title: s.title.trim(),
    instruction: s.instruction.trim(),
    minutes: positiveOrNull(s.minutes),
    passive: s.passive,
  }));

  // Les temps déclarés ne peuvent pas être inférieurs à la somme des étapes correspondantes.
  const stepSum = (passive: boolean) =>
    steps.filter((s) => s.passive === passive).reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const activeMinutes = Math.round(Math.max(raw.activeMinutes, stepSum(false), 1));
  const passiveMinutes = Math.round(Math.max(raw.passiveMinutes, stepSum(true), 0));
  const totalMinutes = activeMinutes + passiveMinutes;
  if (totalMinutes > 24 * 60) throw new AiOutputError('Durée incohérente');

  const recipe: Recipe = {
    title: raw.title.trim(),
    emoji: [...raw.emoji.trim()].slice(0, 2).join('') || '🍽️',
    description: raw.description.trim(),
    cuisine: raw.cuisine.trim(),
    difficulty: raw.difficulty,
    servings: raw.servings > 0 ? raw.servings : servings,
    activeMinutes,
    passiveMinutes,
    totalMinutes,
    ingredients: annotateIngredients(ingredients, inventory),
    steps,
    tips: raw.tips.map((t) => t.trim()).filter(Boolean).slice(0, 4),
  };
  // L'IA doit respecter le nombre de personnes demandé ; sinon on recalcule les quantités.
  return recipe.servings === servings ? recipe : scaleTo(recipe, servings);
}

function scaleTo(recipe: Recipe, servings: number): Recipe {
  const factor = servings / recipe.servings;
  const scale = (v: number | null) => (v === null ? null : Math.round(v * factor * 100) / 100);
  return {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map((i) => ({ ...i, amount: scale(i.amount), grams: scale(i.grams) })),
  };
}

const positiveOrNull = (v: number | null) => (v !== null && Number.isFinite(v) && v > 0 ? v : null);
