import {
  normalizeIngredientName,
  type InventoryItem,
  type StockLevel,
} from '@kooka/shared';
import type { Db } from '../../db/index.js';

interface Row {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  stock_level: StockLevel;
  created_at: string;
  updated_at: string;
}

export interface InventoryFields {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  stockLevel: StockLevel;
}

const toItem = (row: Row): InventoryItem => ({
  id: row.id,
  name: row.name,
  quantity: row.quantity,
  unit: row.unit,
  category: row.category,
  stockLevel: row.stock_level,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Accès SQL brut à l'inventaire. Les règles métier vivent dans `inventory.service.ts`. */
export function createInventoryRepository(db: Db) {
  const stmts = {
    list: db.prepare<[], Row>('SELECT * FROM inventory_items ORDER BY name COLLATE NOCASE'),
    search: db.prepare<[string], Row>(
      'SELECT * FROM inventory_items WHERE normalized_name LIKE ? ORDER BY name COLLATE NOCASE',
    ),
    byId: db.prepare<[number], Row>('SELECT * FROM inventory_items WHERE id = ?'),
    byKey: db.prepare<[string], Row>('SELECT * FROM inventory_items WHERE normalized_name = ?'),
    insert: db.prepare<[string, string, number | null, string | null, string | null, StockLevel], Row>(
      `INSERT INTO inventory_items (name, normalized_name, quantity, unit, category, stock_level)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    ),
    update: db.prepare<
      [string, string, number | null, string | null, string | null, StockLevel, number],
      Row
    >(
      `UPDATE inventory_items
       SET name = ?, normalized_name = ?, quantity = ?, unit = ?, category = ?, stock_level = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? RETURNING *`,
    ),
    remove: db.prepare<[number]>('DELETE FROM inventory_items WHERE id = ?'),
  };

  return {
    list(search?: string): InventoryItem[] {
      if (!search) return stmts.list.all().map(toItem);
      const pattern = `%${normalizeIngredientName(search).replace(/[%_]/g, '')}%`;
      return stmts.search.all(pattern).map(toItem);
    },
    findById(id: number): InventoryItem | undefined {
      const row = stmts.byId.get(id);
      return row && toItem(row);
    },
    findByName(name: string): InventoryItem | undefined {
      const row = stmts.byKey.get(normalizeIngredientName(name));
      return row && toItem(row);
    },
    insert(f: InventoryFields): InventoryItem {
      const key = normalizeIngredientName(f.name);
      return toItem(stmts.insert.get(f.name, key, f.quantity, f.unit, f.category, f.stockLevel)!);
    },
    update(id: number, f: InventoryFields): InventoryItem {
      const key = normalizeIngredientName(f.name);
      return toItem(stmts.update.get(f.name, key, f.quantity, f.unit, f.category, f.stockLevel, id)!);
    },
    remove(id: number): boolean {
      return stmts.remove.run(id).changes > 0;
    },
    transaction: <T>(fn: () => T) => db.transaction(fn)(),
  };
}

export type InventoryRepository = ReturnType<typeof createInventoryRepository>;
