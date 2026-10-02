import type { InventoryItem, Preferences, Recipe, RecipeRequest, SuggestionFilters } from '@kooka/shared';
import type { AiAnswer, AiRecipe, AiSuggestions } from './schemas.js';

export interface SuggestContext {
  inventory: InventoryItem[];
  preferences: Preferences;
  filters: SuggestionFilters;
  exclude: string[];
  count: number;
}

export interface RecipeContext {
  inventory: InventoryItem[];
  preferences: Preferences;
  suggestion: RecipeRequest['suggestion'];
  servings: number;
  ignoreInventory: boolean;
}

export interface AskContext {
  recipe: Recipe;
  stepIndex: number;
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

/** Fournisseur de contenu culinaire. Ne contient aucune règle métier. */
export interface RecipeAI {
  suggest(ctx: SuggestContext): Promise<AiSuggestions>;
  recipe(ctx: RecipeContext): Promise<AiRecipe>;
  /** Réponse courte à une question posée pendant la préparation. */
  ask(ctx: AskContext): Promise<AiAnswer>;
}

/** La réponse de l'IA est inexploitable : on peut réessayer une fois. */
export class AiOutputError extends Error {}
