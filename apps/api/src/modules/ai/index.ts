import { createAnthropicAI } from './anthropic.js';
import { createMockAI } from './mock.js';
import type { RecipeAI } from './provider.js';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export function createAIFromEnv(env: NodeJS.ProcessEnv = process.env): RecipeAI {
  if (env.AI_PROVIDER === 'mock' || !env.ANTHROPIC_API_KEY) {
    console.warn('[ai] Mode simulé : réponses factices (définis ANTHROPIC_API_KEY pour la vraie IA).');
    return createMockAI();
  }
  return createAnthropicAI({ model: env.AI_MODEL || DEFAULT_MODEL, apiKey: env.ANTHROPIC_API_KEY });
}

export { AiOutputError, type RecipeAI } from './provider.js';
