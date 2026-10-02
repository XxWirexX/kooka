import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  updatePreferencesSchema,
  type Preferences,
} from '@kooka/shared';
import type { Db } from '../../db/index.js';

/** Préférences de l'utilisateur (une seule ligne : le MVP est mono-utilisateur). */
export function createPreferencesService(db: Db) {
  const read = db.prepare<[], { data: string }>('SELECT data FROM preferences WHERE id = 1');
  const write = db.prepare<[string]>(
    'INSERT INTO preferences (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
  );

  function get(): Preferences {
    const row = read.get();
    if (!row) return DEFAULT_PREFERENCES;
    // Complète avec les valeurs par défaut si de nouveaux champs ont été ajoutés depuis.
    const parsed = preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...JSON.parse(row.data) });
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  }

  return {
    get,
    update(input: unknown): Preferences {
      const patch = updatePreferencesSchema.parse(input);
      const next = preferencesSchema.parse({ ...get(), ...patch });
      write.run(JSON.stringify(next));
      return next;
    },
  };
}

export type PreferencesService = ReturnType<typeof createPreferencesService>;
