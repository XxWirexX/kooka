import { askSchema, startCookingSchema, updateCookingSchema, type CookingSession, type Recipe } from '@kooka/shared';
import type { Db } from '../../db/index.js';
import { withRetry } from '../../lib/cache.js';
import { notFound } from '../../lib/http.js';
import { AiOutputError, type RecipeAI } from '../ai/index.js';

interface Row {
  id: number;
  recipe: string;
  servings: number;
  current_step: number;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
}

const toSession = (row: Row): CookingSession => ({
  id: row.id,
  recipe: JSON.parse(row.recipe) as Recipe,
  servings: row.servings,
  currentStep: row.current_step,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  finishedAt: row.finished_at,
});

/**
 * Recettes en cours de préparation. Plusieurs peuvent être actives en même temps
 * (meal prep) : on les quitte et on y revient à l'étape où on en était.
 */
export function createCookingService(db: Db, ai: RecipeAI) {
  const stmts = {
    active: db.prepare<[], Row>('SELECT * FROM cooking_sessions WHERE finished_at IS NULL ORDER BY started_at, id'),
    history: db.prepare<[], Row>(
      'SELECT * FROM cooking_sessions WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 30',
    ),
    byId: db.prepare<[number], Row>('SELECT * FROM cooking_sessions WHERE id = ?'),
    insert: db.prepare<[string, number], Row>(
      'INSERT INTO cooking_sessions (recipe, servings) VALUES (?, ?) RETURNING *',
    ),
    update: db.prepare<[number, number, number], Row>(
      `UPDATE cooking_sessions SET current_step = ?, servings = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? RETURNING *`,
    ),
    finish: db.prepare<[number], Row>(
      `UPDATE cooking_sessions SET finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND finished_at IS NULL RETURNING *`,
    ),
    remove: db.prepare<[number]>('DELETE FROM cooking_sessions WHERE id = ?'),
  };

  function get(id: number): CookingSession {
    const row = stmts.byId.get(id);
    if (!row) throw notFound('Préparation');
    return toSession(row);
  }

  return {
    active: () => stmts.active.all().map(toSession),
    history: () => stmts.history.all().map(toSession),
    get,

    start(input: unknown): CookingSession {
      const { recipe, servings } = startCookingSchema.parse(input);
      return toSession(stmts.insert.get(JSON.stringify(recipe), servings ?? recipe.servings)!);
    },

    update(id: number, input: unknown): CookingSession {
      const session = get(id);
      const patch = updateCookingSchema.parse(input);
      const lastStep = session.recipe.steps.length - 1;
      const step = Math.min(patch.currentStep ?? session.currentStep, lastStep);
      return toSession(stmts.update.get(step, patch.servings ?? session.servings, id)!);
    },

    finish(id: number): CookingSession {
      const row = stmts.finish.get(id);
      return row ? toSession(row) : get(id);
    },

    /** Abandonner une préparation : elle disparaît, sans entrer dans l'historique. */
    remove(id: number) {
      if (stmts.remove.run(id).changes === 0) throw notFound('Préparation');
    },

    async ask(id: number, input: unknown) {
      const session = get(id);
      const { question, stepIndex, history } = askSchema.parse(input);
      return withRetry(
        () =>
          ai.ask({
            recipe: session.recipe,
            stepIndex: Math.min(stepIndex, session.recipe.steps.length - 1),
            question,
            history,
          }),
        (err) => err instanceof AiOutputError,
      );
    },
  };
}
