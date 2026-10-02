import { DIFFICULTIES } from '@kooka/shared';
import { z } from 'zod';

/*
 * Schémas des réponses brutes de l'IA (sorties structurées).
 * Volontairement simples : les règles métier (bornes, cohérence des temps, disponibilité)
 * sont appliquées ensuite par le backend, pas déléguées au modèle.
 */

const aiKeyIngredient = z.object({
  name: z.string().describe('Nom courant en français, ex. « blanc de poulet »'),
  optional: z.boolean().describe('true si on peut faire le plat sans'),
  staple: z.boolean().describe('true pour les basiques du placard : sel, poivre, huile, beurre, farine, sucre, eau…'),
  inventoryMatch: z
    .string()
    .nullable()
    .describe("Nom EXACT de l'ingrédient de l'inventaire utilisé pour cet ingrédient, sinon null"),
});

export const aiSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string().describe('Nom du plat, court et appétissant'),
      emoji: z.string().describe('Un seul emoji représentant le plat'),
      pitch: z.string().describe('Une phrase qui donne envie (max 20 mots)'),
      cuisine: z.string().describe('Origine ou type de cuisine, ex. « Thaïlandaise »'),
      difficulty: z.enum(DIFFICULTIES),
      totalMinutes: z.number().int().describe('Temps total réaliste, attentes comprises'),
      reason: z
        .string()
        .describe("Pourquoi ce plat pour cet utilisateur, en le tutoyant (max 25 mots)"),
      ingredients: z.array(aiKeyIngredient).describe('Tous les ingrédients du plat, basiques compris'),
    }),
  ),
});
export type AiSuggestions = z.infer<typeof aiSuggestionsSchema>;
export type AiSuggestion = AiSuggestions['suggestions'][number];

export const aiRecipeSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  description: z.string().describe('2 phrases maximum'),
  cuisine: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  servings: z.number().int(),
  activeMinutes: z.number().int().describe('Temps où la personne travaille réellement'),
  passiveMinutes: z.number().int().describe('Marinade, repos, cuisson sans surveillance'),
  ingredients: z.array(
    aiKeyIngredient.extend({
      amount: z.number().nullable().describe('Quantité numérique pour le nombre de personnes'),
      unit: z
        .string()
        .nullable()
        .describe('g, kg, ml, cl, L, c. à soupe, c. à café, gousse, tranche… ; null pour un nombre de pièces'),
      grams: z
        .number()
        .nullable()
        .describe('Poids approximatif total en grammes quand la quantité est en pièces, sinon null'),
      note: z.string().nullable().describe('Précision courte : « une pincée », « en dés »… ou null'),
    }),
  ),
  steps: z.array(
    z.object({
      title: z.string().describe('2 à 5 mots'),
      instruction: z.string().describe('Instruction claire et précise, 1 à 3 phrases'),
      minutes: z.number().int().nullable(),
      passive: z.boolean().describe("true si c'est un temps d'attente"),
    }),
  ),
  tips: z
    .array(z.string())
    .describe('0 à 3 remarques réellement utiles (quantités incertaines, substitution, astuce). Vide si rien à dire.'),
});
export type AiRecipe = z.infer<typeof aiRecipeSchema>;
