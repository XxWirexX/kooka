import {
  normalizeIngredientName,
  suggestionsRequestSchema,
  type InventoryItem,
  type Suggestion,
  type SuggestionsResponse,
} from '@kooka/shared';
import { annotateIngredients, computeAvailability } from '../../lib/availability.js';
import { TtlCache, hashKey, withRetry } from '../../lib/cache.js';
import { AiOutputError, type RecipeAI } from '../ai/index.js';
import type { AiSuggestions } from '../ai/schemas.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';

const SUGGESTION_COUNT = 3;

export function createSuggestionsService(ai: RecipeAI, inventoryRepo: InventoryRepository) {
  const cache = new TtlCache<SuggestionsResponse>(6 * 60 * 60 * 1000);

  return {
    async suggest(input: unknown): Promise<SuggestionsResponse> {
      const { filters, exclude } = suggestionsRequestSchema.parse(input);
      const inventory = filters.ignoreInventory ? [] : inventoryRepo.list();

      // Même inventaire + mêmes filtres + mêmes exclusions → mêmes suggestions, sans rappeler l'IA.
      const key = hashKey({
        inventory: inventory.map((i) => [i.name, i.stockLevel, i.quantity, i.unit]),
        filters,
        exclude,
      });
      const cached = cache.get(key);
      if (cached) return cached;

      const result = await withRetry(
        async () => {
          const raw = await ai.suggest({ inventory, filters, exclude, count: SUGGESTION_COUNT });
          return finalizeSuggestions(raw, inventory, { exclude, maxMinutes: filters.maxMinutes ?? null });
        },
        (err) => err instanceof AiOutputError,
      );
      cache.set(key, result);
      return result;
    },
  };
}

/** Règles métier appliquées à la réponse brute : filtrage, dédoublonnage, disponibilité. */
export function finalizeSuggestions(
  raw: AiSuggestions,
  inventory: InventoryItem[],
  opts: { exclude: string[]; maxMinutes: number | null },
): SuggestionsResponse {
  const seen = new Set(opts.exclude.map(normalizeIngredientName));
  const suggestions: Suggestion[] = [];

  for (const s of raw.suggestions) {
    const titleKey = normalizeIngredientName(s.title);
    if (seen.has(titleKey)) continue;
    if (!Number.isFinite(s.totalMinutes) || s.totalMinutes < 5 || s.totalMinutes > 24 * 60) continue;
    if (opts.maxMinutes && s.totalMinutes > opts.maxMinutes * 1.15) continue;
    if (s.ingredients.length < 2) continue;
    seen.add(titleKey);

    const ingredients = annotateIngredients(s.ingredients, inventory);
    suggestions.push({
      id: hashKey([s.title, s.cuisine]).slice(0, 12),
      title: s.title.trim(),
      emoji: [...s.emoji.trim()].slice(0, 2).join('') || '🍽️',
      pitch: s.pitch.trim(),
      cuisine: s.cuisine.trim(),
      difficulty: s.difficulty,
      totalMinutes: Math.round(s.totalMinutes),
      reason: s.reason.trim(),
      ingredients,
      availability: computeAvailability(ingredients),
    });
    if (suggestions.length === SUGGESTION_COUNT) break;
  }

  if (suggestions.length === 0) throw new AiOutputError('Aucune suggestion exploitable');
  return { suggestions };
}
