import { createAnthropicAI } from './anthropic.js';
import type { AiConfig } from './config.js';
import { createMockAI } from './mock.js';
import { createOpenAIAI } from './openai.js';
import type { RecipeAI } from './provider.js';

const DEFAULT_MODELS = {
  anthropic: 'claude-opus-5-5',
  openai: 'gpt-5.5',
} as const;

/**
 * Réflexion par défaut : faible pour les deux appels, c'est le meilleur levier de coût.
 * Si les recettes perdent en qualité, passer AI_EFFORT_RECIPE=medium.
 */
const DEFAULT_EFFORT = { suggest: 'low', recipe: 'low' } as const;

type Provider = 'anthropic' | 'openai' | 'mock';

/**
 * Choisit le fournisseur IA :
 * - AI_PROVIDER=openai | anthropic | mock si défini ;
 * - sinon, celui dont la clé est présente (OpenAI puis Anthropic) ;
 * - sinon, le mode simulé.
 *
 * Modèle et réflexion se règlent par type d'appel :
 * AI_MODEL_SUGGEST / AI_MODEL_RECIPE (sinon AI_MODEL, sinon le modèle par défaut),
 * AI_EFFORT_SUGGEST / AI_EFFORT_RECIPE.
 */
export function createAIFromEnv(env: NodeJS.ProcessEnv = process.env): RecipeAI {
  const provider = resolveProvider(env);
  if (provider === 'mock') {
    console.warn('[ai] Mode simulé : réponses factices (configure une clé API pour la vraie IA).');
    return createMockAI();
  }

  const apiKey = provider === 'openai' ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(`AI_PROVIDER=${provider} mais ${provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} est vide`);
  }

  const model = env.AI_MODEL || DEFAULT_MODELS[provider];
  const config: AiConfig = {
    suggest: { model: env.AI_MODEL_SUGGEST || model, effort: env.AI_EFFORT_SUGGEST || DEFAULT_EFFORT.suggest },
    recipe: { model: env.AI_MODEL_RECIPE || model, effort: env.AI_EFFORT_RECIPE || DEFAULT_EFFORT.recipe },
  };
  console.log(
    `[ai] ${provider} · suggestions : ${config.suggest.model} (${config.suggest.effort})` +
      ` · recette : ${config.recipe.model} (${config.recipe.effort})`,
  );
  return provider === 'openai' ? createOpenAIAI({ config, apiKey }) : createAnthropicAI({ config, apiKey });
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
