import { describe, expect, it } from 'vitest';
import { createAIFromEnv } from '../src/modules/ai/index.js';

describe('choix du fournisseur IA', () => {
  it('passe en mode simulé sans clé', () => {
    expect(() => createAIFromEnv({})).not.toThrow();
  });

  it('refuse un fournisseur explicite sans sa clé', () => {
    expect(() => createAIFromEnv({ AI_PROVIDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
  });

  it('refuse un fournisseur inconnu', () => {
    expect(() => createAIFromEnv({ AI_PROVIDER: 'mistral' })).toThrow(/inconnu/);
  });

  it('accepte OpenAI ou Anthropic avec leur clé', () => {
    expect(() => createAIFromEnv({ OPENAI_API_KEY: 'sk-test' })).not.toThrow();
    expect(() => createAIFromEnv({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-test' })).not.toThrow();
  });
});
