import { createAnthropicAI } from './anthropic.js';
import { createMockAI } from './mock.js';
import { createOpenAIAI } from './openai.js';
import type { RecipeAI } from './provider.js';

const DEFAULT_MODELS = {
  anthropic: 'claude-opus-5-5',
  openai: 'gpt-5.5',
} as const;

type Provider = 'anthropic' | 'openai' | 'mock';

/**
 * Choisit le fournisseur IA :
 * - AI_PROVIDER=openai | anthropic | mock si défini ;
 * - sinon, celui dont la clé est présente (OpenAI puis Anthropic) ;
 * - sinon, le mode simulé.
 * AI_MODEL permet de changer de modèle chez le fournisseur choisi.
 */
export function createAIFromEnv(env: NodeJS.ProcessEnv = process.env): RecipeAI {
  const provider = resolveProvider(env);
  if (provider === 'mock') {
    console.warn('[ai] Mode simulé : réponses factices (configure une clé API pour la vraie IA).');
    return createMockAI();
  }

  const model = env.AI_MODEL || DEFAULT_MODELS[provider];
  const apiKey = provider === 'openai' ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(`AI_PROVIDER=${provider} mais ${provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} est vide`);
  }
  console.log(`[ai] ${provider} · ${model}`);
  return provider === 'openai' ? createOpenAIAI({ model, apiKey }) : createAnthropicAI({ model, apiKey });
}

function resolveProvider(env: NodeJS.ProcessEnv): Provider {
  const explicit = env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === 'openai' || explicit === 'anthropic' || explicit === 'mock') return explicit;
  if (explicit) throw new Error(`AI_PROVIDER inconnu : « ${explicit} » (openai, anthropic ou mock)`);
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

export { AiOutputError, type RecipeAI } from './provider.js';
