import type { InventoryItem, Preferences } from '@kooka/shared';
import type { InventoryRepository } from '../modules/inventory/inventory.repository.js';
import type { PreferencesService } from '../modules/preferences/preferences.service.js';

/**
 * Ce que Kooka sait de la cuisine de l'utilisateur à un instant donné :
 * son inventaire, ses préférences et, s'il les a, ses basiques du placard.
 */
export interface KitchenSnapshot {
  inventory: InventoryItem[];
  preferences: Preferences;
  /** Inventaire + basiques déclarés (comptés comme disponibles), pour le calcul des statuts. */
  stock: InventoryItem[];
}

export function createKitchen(inventoryRepo: InventoryRepository, preferences: PreferencesService) {
  return {
    snapshot(): KitchenSnapshot {
      const inventory = inventoryRepo.list();
      const prefs = preferences.get();
      return { inventory, preferences: prefs, stock: withStaples(inventory, prefs) };
    },
  };
}

export type Kitchen = ReturnType<typeof createKitchen>;

export function withStaples(inventory: InventoryItem[], prefs: Preferences): InventoryItem[] {
  if (!prefs.hasStaples) return inventory;
  const virtual = prefs.staples.map(
    (name, i): InventoryItem => ({
      id: -1 - i,
      name,
      quantity: null,
      unit: null,
      category: 'Basiques',
      stockLevel: 'some',
      createdAt: '',
      updatedAt: '',
    }),
  );
  // Un ingrédient réellement présent dans l'inventaire l'emporte sur le basique du même nom.
  return [...inventory, ...virtual];
}
