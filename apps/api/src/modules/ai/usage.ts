import type { AiTask } from './config.js';

/**
 * Prix connus en dollars par million de tokens [entrée, sortie].
 * Les prix OpenAI ne sont pas codés en dur : renseigne-les via AI_PRICES dans .env,
 * ex. AI_PRICES={"gpt-5.5":[1.25,10]} (valeurs à prendre sur la page tarifs d'OpenAI).
 */
const KNOWN_PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-4-5': [1, 5],
};

function loadPrices(): Record<string, [number, number]> {
  try {
    return { ...KNOWN_PRICES, ...(process.env.AI_PRICES ? JSON.parse(process.env.AI_PRICES) : {}) };
  } catch {
    console.warn('[ai] AI_PRICES illisible, ignoré');
    return KNOWN_PRICES;
  }
}

const prices = loadPrices();

const TASK_LABELS: Record<AiTask, string> = { suggest: 'suggestions', recipe: 'recette', ask: 'question' };

export interface UsageReport {
  task: AiTask;
  model: string;
  inputTokens: number;
  /** Tokens d'entrée servis depuis le cache du fournisseur (facturés moins cher). */
  cachedTokens: number;
  /** Tokens de sortie, réflexion comprise. */
  outputTokens: number;
  /** Part de la sortie consacrée à la réflexion, quand le fournisseur la donne. */
  reasoningTokens: number | null;
  ms: number;
}

/** Affiche dans le terminal la consommation de chaque appel, pour comparer modèles et réglages. */
export function logUsage(u: UsageReport) {
  const price = prices[u.model];
  const cost = price ? (u.inputTokens * price[0] + u.outputTokens * price[1]) / 1_000_000 : null;
  const parts = [
    `entrée ${u.inputTokens}${u.cachedTokens ? ` (dont ${u.cachedTokens} en cache)` : ''}`,
    `sortie ${u.outputTokens}${u.reasoningTokens !== null ? ` (dont ${u.reasoningTokens} de réflexion)` : ''}`,
    `${(u.ms / 1000).toFixed(1)} s`,
    cost !== null ? `≈ ${cost.toFixed(4)} $` : 'coût : définis AI_PRICES',
  ];
  console.log(`[ai] ${TASK_LABELS[u.task]} · ${u.model} · ${parts.join(' · ')}`);
}
