import {
  createInventoryItemSchema,
  splitQuickAdd,
  updateInventoryItemSchema,
  type InventoryItem,
} from '@kooka/shared';
import { HttpError, notFound } from '../../lib/http.js';
import type { InventoryRepository } from './inventory.repository.js';

/**
 * Règles métier de l'inventaire.
 *
 * - Ajouter un ingrédient déjà présent ne crée pas de doublon : on le « réapprovisionne »
 *   (s'il était à `out`, il repasse à `some`) et on fusionne les champs fournis.
 * - Renommer un ingrédient vers un nom déjà utilisé est refusé (409).
 */
export function createInventoryService(repo: InventoryRepository) {
  function add(input: unknown): { item: InventoryItem; created: boolean } {
    const data = createInventoryItemSchema.parse(input);
    const existing = repo.findByName(data.name);
    if (existing) {
      const item = repo.update(existing.id, {
        name: existing.name,
        quantity: data.quantity !== undefined ? data.quantity : existing.quantity,
        unit: data.unit !== undefined ? data.unit : existing.unit,
        category: data.category !== undefined ? data.category : existing.category,
        stockLevel: data.stockLevel ?? (existing.stockLevel === 'out' ? 'some' : existing.stockLevel),
      });
      return { item, created: false };
    }
    const item = repo.insert({
      name: data.name,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      category: data.category ?? null,
      stockLevel: data.stockLevel ?? 'some',
    });
    return { item, created: true };
  }

  return {
    list: (search?: string) => repo.list(search?.trim() || undefined),

    add,

    quickAdd(text: string): InventoryItem[] {
      const names = splitQuickAdd(text);
      if (names.length === 0) throw new HttpError(400, 'Aucun ingrédient reconnu');
      return repo.transaction(() => names.map((name) => add({ name }).item));
    },

    update(id: number, input: unknown): InventoryItem {
      const existing = repo.findById(id);
      if (!existing) throw notFound('Ingrédient');
      const data = updateInventoryItemSchema.parse(input);
      if (data.name !== undefined) {
        const clash = repo.findByName(data.name);
        if (clash && clash.id !== id) {
          throw new HttpError(409, `« ${clash.name} » est déjà dans ton inventaire`);
        }
      }
      return repo.update(id, {
        name: data.name ?? existing.name,
        quantity: data.quantity !== undefined ? data.quantity : existing.quantity,
        unit: data.unit !== undefined ? data.unit : existing.unit,
        category: data.category !== undefined ? data.category : existing.category,
        stockLevel: data.stockLevel ?? existing.stockLevel,
      });
    },

    remove(id: number) {
      if (!repo.remove(id)) throw notFound('Ingrédient');
    },
  };
}

export type InventoryService = ReturnType<typeof createInventoryService>;
