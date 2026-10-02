import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { HttpError } from '../../lib/http.js';
import { ASK_SYSTEM, RECIPE_SYSTEM, SUGGEST_SYSTEM, askPrompt, recipePrompt, suggestPrompt } from './prompts.js';
import type { AiConfig, AiTask } from './config.js';
import { AiOutputError, type RecipeAI } from './provider.js';
import { aiAnswerSchema, aiRecipeSchema, aiSuggestionsSchema } from './schemas.js';
import { logUsage } from './usage.js';

/** Fournisseur OpenAI (API Responses + sorties structurées). Mêmes prompts et schémas que Claude. */
export function createOpenAIAI(options: { config: AiConfig; apiKey?: string; fetch?: typeof fetch }): RecipeAI {
  const client = new OpenAI({ apiKey: options.apiKey, fetch: options.fetch });

  async function generate<T extends z.ZodType>(
    task: AiTask,
    schema: T,
    system: string,
    prompt: string,
  ): Promise<z.infer<T>> {
    const { model, effort } = options.config[task];
    const started = Date.now();
    try {
      const res = await client.responses.parse({
        model,
        instructions: system,
        input: prompt,
        reasoning: { effort: effort as OpenAI.ReasoningEffort },
        max_output_tokens: 16000,
        text: { format: zodTextFormat(schema, task) },
      });
      if (res.usage) {
        logUsage({
          task,
          model,
          inputTokens: res.usage.input_tokens,
          cachedTokens: res.usage.input_tokens_details?.cached_tokens ?? 0,
          outputTokens: res.usage.output_tokens,
          reasoningTokens: res.usage.output_tokens_details?.reasoning_tokens ?? null,
          ms: Date.now() - started,
        });
      }
      if (res.status === 'incomplete') {
        throw new AiOutputError(`Réponse incomplète (${res.incomplete_details?.reason ?? 'inconnu'})`);
      }
      const refused = res.output.some(
        (item) => item.type === 'message' && item.content.some((c) => c.type === 'refusal'),
      );
      if (refused) throw new HttpError(422, "L'IA n'a pas pu traiter cette demande");
      if (!res.output_parsed) throw new AiOutputError('Réponse non structurée');
      return res.output_parsed as z.infer<T>;
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
  if (err instanceof OpenAI.AuthenticationError) return new HttpError(503, 'Clé API IA invalide');
  if (err instanceof OpenAI.RateLimitError) {
    console.error('[ai]', err.message);
    return new HttpError(
      429,
      err.code === 'insufficient_quota' ? 'Crédit IA épuisé' : "L'IA est très sollicitée, réessaie dans un instant",
    );
  }
  if (err instanceof OpenAI.APIError) {
    console.error('[ai]', err.status, err.message);
    return new HttpError(503, err.status === 400 ? "L'IA a rejeté la requête" : 'Service IA indisponible');
  }
  // Sortie JSON illisible ou non conforme au schéma : un nouvel essai est possible.
  console.error('[ai]', err);
  return new AiOutputError(err instanceof Error ? err.message : 'Réponse invalide');
}
