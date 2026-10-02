import type { InventoryItem, RecipeRequest, SuggestionFilters } from '@kooka/shared';
import type { AiRecipe, AiSuggestions } from './schemas.js';

export interface SuggestContext {
  inventory: InventoryItem[];
  filters: SuggestionFilters;
  exclude: string[];
  count: number;
}

export interface RecipeContext {
  inventory: InventoryItem[];
  suggestion: RecipeRequest['suggestion'];
  servings: number;
  ignoreInventory: boolean;
}

/** Fournisseur de contenu culinaire. Ne contient aucune règle métier. */
export interface RecipeAI {
  suggest(ctx: SuggestContext): Promise<AiSuggestions>;
  recipe(ctx: RecipeContext): Promise<AiRecipe>;
}

/** La réponse de l'IA est inexploitable : on peut réessayer une fois. */
export class AiOutputError extends Error {}
