import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { HttpError } from '../../lib/http.js';
import { RECIPE_SYSTEM, SUGGEST_SYSTEM, recipePrompt, suggestPrompt } from './prompts.js';
import { AiOutputError, type RecipeAI } from './provider.js';
import { aiRecipeSchema, aiSuggestionsSchema } from './schemas.js';

type Effort = 'low' | 'medium' | 'high';

/** Fournisseur OpenAI (API Responses + sorties structurées). Mêmes prompts et schémas que Claude. */
export function createOpenAIAI(options: { model: string; apiKey?: string }): RecipeAI {
  const client = new OpenAI({ apiKey: options.apiKey });

  async function generate<T extends z.ZodType>(
    schema: T,
    name: string,
    system: string,
    prompt: string,
    effort: Effort,
  ): Promise<z.infer<T>> {
    try {
      const res = await client.responses.parse({
        model: options.model,
        instructions: system,
        input: prompt,
        reasoning: { effort },
        max_output_tokens: 16000,
        text: { format: zodTextFormat(schema, name) },
      });
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
    suggest: (ctx) => generate(aiSuggestionsSchema, 'suggestions', SUGGEST_SYSTEM, suggestPrompt(ctx), 'low'),
    recipe: (ctx) => generate(aiRecipeSchema, 'recipe', RECIPE_SYSTEM, recipePrompt(ctx), 'medium'),
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
