import { z } from 'zod';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Intermédiaire',
  hard: 'Ambitieux',
};

export const CUISINES = [
  'Française',
  'Italienne',
  'Asiatique',
  'Indienne',
  'Méditerranéenne',
  'Mexicaine',
  'Moyen-Orient',
  'Africaine',
] as const;

/**
 * Statut d'un ingrédient de recette par rapport à l'inventaire.
 * - available : dans l'inventaire (plenty / some)
 * - low       : dans l'inventaire, mais presque fini
 * - missing   : dans l'inventaire, marqué « plus du tout »
 * - unknown   : absent de l'inventaire — on ne sait pas, on ne le compte pas comme manquant
 */
export const RECIPE_INGREDIENT_STATUSES = ['available', 'low', 'missing', 'unknown'] as const;
export type RecipeIngredientStatus = (typeof RECIPE_INGREDIENT_STATUSES)[number];

// --- Requêtes ---------------------------------------------------------------

export const suggestionFiltersSchema = z.object({
  maxMinutes: z.number().int().min(10).max(600).nullable().optional(),
  cuisine: z.string().trim().max(40).nullable().optional(),
  ignoreInventory: z.boolean().optional(),
});
export type SuggestionFilters = z.infer<typeof suggestionFiltersSchema>;

export const suggestionsRequestSchema = z.object({
  filters: suggestionFiltersSchema.default({}),
  /** Titres déjà proposés dans la session, pour que « Autres idées » explore autre chose. */
  exclude: z.array(z.string().trim().max(120)).max(60).default([]),
});
export type SuggestionsRequest = z.input<typeof suggestionsRequestSchema>;

// --- Suggestions ------------------------------------------------------------

export const keyIngredientSchema = z.object({
  name: z.string(),
  optional: z.boolean(),
  /** Basique du placard (sel, poivre, huile…) : ne pénalise jamais une recette. */
  staple: z.boolean(),
  /** Nom exact de l'ingrédient d'inventaire correspondant, si l'IA en a reconnu un. */
  inventoryMatch: z.string().nullable(),
});

export const suggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  pitch: z.string(),
  cuisine: z.string(),
  difficulty: difficultySchema,
  totalMinutes: z.number(),
  reason: z.string(),
  ingredients: z.array(
    keyIngredientSchema.extend({ status: z.enum(RECIPE_INGREDIENT_STATUSES) }),
  ),
  availability: z.object({
    /** Ingrédients indispensables (hors facultatifs et basiques) présents dans l'inventaire. */
    available: z.number(),
    /** Nombre d'ingrédients indispensables (hors facultatifs et basiques). */
    required: z.number(),
    missing: z.array(z.string()),
    unknown: z.array(z.string()),
  }),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// --- Recettes ---------------------------------------------------------------

export const recipeIngredientSchema = z.object({
  name: z.string(),
  /** Quantité pour le nombre de personnes de la recette, ex. 2 (carottes) ou 200 (g). */
  amount: z.number().nullable(),
  unit: z.string().nullable(),
  /** Poids approximatif en grammes quand l'unité est une pièce : « 2 carottes (~250 g) ». */
  grams: z.number().nullable(),
  /** Précision libre : « une pincée », « coupé en dés »… */
  note: z.string().nullable(),
  optional: z.boolean(),
  staple: z.boolean(),
  inventoryMatch: z.string().nullable(),
  status: z.enum(RECIPE_INGREDIENT_STATUSES),
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const recipeStepSchema = z.object({
  title: z.string(),
  instruction: z.string(),
  minutes: z.number().nullable(),
  /** Temps d'attente (marinade, repos, cuisson sans surveillance). */
  passive: z.boolean(),
});
export type RecipeStep = z.infer<typeof recipeStepSchema>;

export const recipeSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  description: z.string(),
  cuisine: z.string(),
  difficulty: difficultySchema,
  servings: z.number(),
  activeMinutes: z.number(),
  passiveMinutes: z.number(),
  totalMinutes: z.number(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(recipeStepSchema),
  /** Remarques utiles uniquement (peut être vide). */
  tips: z.array(z.string()),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const recipeRequestSchema = z.object({
  suggestion: suggestionSchema.pick({
    title: true,
    emoji: true,
    pitch: true,
    cuisine: true,
    difficulty: true,
    totalMinutes: true,
  }).extend({ ingredients: z.array(keyIngredientSchema.pick({ name: true, optional: true })) }),
  servings: z.number().int().min(1).max(12).default(2),
  ignoreInventory: z.boolean().optional(),
});
export type RecipeRequest = z.input<typeof recipeRequestSchema>;

// --- Livre de recettes ------------------------------------------------------

export interface SavedRecipe {
  id: number;
  recipe: Recipe;
  createdAt: string;
}

export const saveRecipeSchema = z.object({ recipe: recipeSchema });

// --- Mise à l'échelle -------------------------------------------------------

/** Recalcule les quantités pour un autre nombre de personnes (arrondis lisibles). */
export function scaleRecipe(recipe: Recipe, servings: number): Recipe {
  if (servings === recipe.servings) return recipe;
  const factor = servings / recipe.servings;
  return {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map((i) => ({
      ...i,
      amount: i.amount === null ? null : roundNicely(i.amount * factor),
      grams: i.grams === null ? null : roundNicely(i.grams * factor),
    })),
  };
}

export function roundNicely(value: number): number {
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 20) return Math.round(value / 5) * 5;
  if (value >= 3) return Math.round(value);
  return Math.round(value * 4) / 4; // quarts : 0.25, 0.5, 1.5…
}
