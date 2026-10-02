import { z } from 'zod';
import { recipeSchema, type Recipe } from './recipes.js';

/** Une recette en cours de préparation : on peut la quitter et y revenir (meal prep). */
export interface CookingSession {
  id: number;
  recipe: Recipe;
  servings: number;
  currentStep: number;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export const startCookingSchema = z.object({
  recipe: recipeSchema,
  servings: z.number().int().min(1).max(12).optional(),
});

export const updateCookingSchema = z.object({
  currentStep: z.number().int().min(0).optional(),
  servings: z.number().int().min(1).max(12).optional(),
});

export const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  stepIndex: z.number().int().min(0),
  /** Derniers échanges, pour suivre le fil sans renvoyer toute la conversation. */
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(6)
    .default([]),
});
export type AskInput = z.input<typeof askSchema>;

export interface AskResponse {
  answer: string;
}
