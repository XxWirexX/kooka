import { saveRecipeSchema, type Recipe, type SavedRecipe } from '@kooka/shared';
import type { Db } from '../../db/index.js';
import { annotateIngredients } from '../../lib/availability.js';
import { notFound } from '../../lib/http.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';

interface Row {
  id: number;
  data: string;
  created_at: string;
}

/** Livre de recettes : sauvegarde simple. Les statuts d'ingrédients sont recalculés à la lecture. */
export function createCookbookService(db: Db, inventoryRepo: InventoryRepository) {
  const stmts = {
    list: db.prepare<[], Row>('SELECT * FROM saved_recipes ORDER BY created_at DESC, id DESC'),
    byId: db.prepare<[number], Row>('SELECT * FROM saved_recipes WHERE id = ?'),
    insert: db.prepare<[string, string], Row>('INSERT INTO saved_recipes (title, data) VALUES (?, ?) RETURNING *'),
    remove: db.prepare<[number]>('DELETE FROM saved_recipes WHERE id = ?'),
  };

  const toSaved = (row: Row): SavedRecipe => {
    const recipe = JSON.parse(row.data) as Recipe;
    return {
      id: row.id,
      createdAt: row.created_at,
      recipe: { ...recipe, ingredients: annotateIngredients(recipe.ingredients, inventoryRepo.list()) },
    };
  };

  return {
    list: () => stmts.list.all().map(toSaved),
    get(id: number) {
      const row = stmts.byId.get(id);
      if (!row) throw notFound('Recette');
      return toSaved(row);
    },
    save(input: unknown) {
      const { recipe } = saveRecipeSchema.parse(input);
      return toSaved(stmts.insert.get(recipe.title, JSON.stringify(recipe))!);
    },
    remove(id: number) {
      if (stmts.remove.run(id).changes === 0) throw notFound('Recette');
    },
  };
}
