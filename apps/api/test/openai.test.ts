import { describe, expect, it, vi } from 'vitest';
import { createOpenAIAI } from '../src/modules/ai/openai.js';

/** Remplace l'API OpenAI par une fausse réponse, pour vérifier la requête envoyée sans rien dépenser. */
function fakeOpenAI(output: unknown) {
  const bodies: Record<string, unknown>[] = [];
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const body = {
      id: 'resp_test',
      object: 'response',
      created_at: 0,
      status: 'completed',
      model: 'gpt-test',
      output: [
        {
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: JSON.stringify(output), annotations: [] }],
        },
      ],
      usage: {
        input_tokens: 1200,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 900,
        output_tokens_details: { reasoning_tokens: 300 },
        total_tokens: 2100,
      },
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return { fetch, bodies };
}

describe('fournisseur OpenAI', () => {
  it('envoie le modèle et la réflexion propres à chaque appel, et journalise la consommation', async () => {
    const { fetch, bodies } = fakeOpenAI({ suggestions: [] });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ai = createOpenAIAI({
      apiKey: 'sk-test',
      config: { suggest: { model: 'gpt-mini', effort: 'minimal' }, recipe: { model: 'gpt-big', effort: 'low' } },
      fetch,
    });

    const res = await ai.suggest({ inventory: [], filters: {}, exclude: [], count: 3 });

    expect(res).toEqual({ suggestions: [] });
    expect(bodies[0]).toMatchObject({ model: 'gpt-mini', reasoning: { effort: 'minimal' } });
    expect(bodies[0]!.text).toMatchObject({ format: { type: 'json_schema', strict: true } });
    expect(log.mock.calls.flat().join(' ')).toMatch(/suggestions · gpt-mini · entrée 1200 .* sortie 900 \(dont 300 de réflexion\)/);
    log.mockRestore();
  });
});
