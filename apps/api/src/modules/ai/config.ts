/** Réglages d'un type d'appel IA : quel modèle, et combien de réflexion avant de répondre. */
export interface TaskConfig {
  model: string;
  /** Niveau de raisonnement. Plus il est bas, moins l'appel coûte (la réflexion est facturée). */
  effort: string;
}

export type AiTask = 'suggest' | 'recipe' | 'ask';
export type AiConfig = Record<AiTask, TaskConfig>;
