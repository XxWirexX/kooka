import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { HttpError } from '../../lib/http.js';
import { ASK_SYSTEM, RECIPE_SYSTEM, SUGGEST_SYSTEM, askPrompt, recipePrompt, suggestPrompt } from './prompts.js';
import type { AiConfig, AiTask } from './config.js';
import { AiOutputError, type RecipeAI } from './provider.js';
import { aiAnswerSchema, aiRecipeSchema, aiSuggestionsSchema } from './schemas.js';
import { logUsage } from './usage.js';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export function createAnthropicAI(options: { config: AiConfig; apiKey?: string }): RecipeAI {
  const client = new Anthropic({ apiKey: options.apiKey });

  async function generate<T extends z.ZodType>(
    task: AiTask,
    schema: T,
    system: string,
    prompt: string,
  ): Promise<z.infer<T>> {
    const { model, effort } = options.config[task];
    const started = Date.now();
    try {
      const res = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: prompt }],
        output_config: { effort: effort as Effort, format: betaZodOutputFormat(schema) },
        // Si le modèle refuse par erreur, l'API relance la requête sur un modèle de repli.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
      logUsage({
        task,
        model,
        inputTokens: res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0),
        cachedTokens: res.usage.cache_read_input_tokens ?? 0,
        outputTokens: res.usage.output_tokens,
        reasoningTokens: null,
        ms: Date.now() - started,
      });
      if (res.stop_reason === 'refusal') throw new HttpError(422, "L'IA n'a pas pu traiter cette demande");
      if (res.stop_reason === 'max_tokens') throw new AiOutputError('Réponse tronquée');
      if (!res.parsed_output) throw new AiOutputError('Réponse non structurée');
      return res.parsed_output;
    } catch (err) {
      throw toHttpError(err);
    }
  }

  return {
    suggest: (ctx) => generate('suggest', aiSuggestionsSchema, SUGGEST_SYSTEM, suggestPrompt(ctx)),
    recipe: (ctx) => generate('recipe', aiRecipeSchema, RECIPE_SYSTEM, recipePrompt(ctx)),
    ask: (ctx) => generate('ask', aiAnswerSchema, ASK_SYSTEM, askPrompt(ctx)),
  };
}

function toHttpError(err: unknown): unknown {
  if (err instanceof HttpError || err instanceof AiOutputError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new HttpError(503, 'Clé API IA invalide');
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, "L'IA est très sollicitée, réessaie dans un instant");
  if (err instanceof Anthropic.BadRequestError) {
    console.error('[ai]', err.message);
    return new HttpError(503, err.message.includes('credit') ? 'Crédit IA épuisé' : "L'IA a rejeté la requête");
  }
  if (err instanceof Anthropic.APIError) {
    console.error('[ai]', err.status, err.message);
    return new HttpError(503, 'Service IA indisponible');
  }
  // Sortie JSON illisible ou non conforme au schéma : un nouvel essai est possible.
  console.error('[ai]', err);
  return new AiOutputError(err instanceof Error ? err.message : 'Réponse invalide');
}
