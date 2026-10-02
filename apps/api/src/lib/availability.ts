import {
  normalizeIngredientName,
  type InventoryItem,
  type RecipeIngredientStatus,
} from '@kooka/shared';

interface IngredientLike {
  name: string;
  optional: boolean;
  staple: boolean;
  inventoryMatch: string | null;
}

/**
 * Retrouve l'ingrédient d'inventaire correspondant à un ingrédient de recette.
 * 1. la correspondance proposée par l'IA, si elle existe vraiment dans l'inventaire ;
 * 2. le même nom normalisé ;
 * 3. l'inclusion des mots (« blanc de poulet » ↔ « poulet »).
 */
export function findInInventory(ingredient: IngredientLike, inventory: InventoryItem[]) {
  const keyed = inventory.map((item) => ({ item, key: normalizeIngredientName(item.name) }));
  const byKey = (key: string) => keyed.find((k) => k.key === key)?.item;

  if (ingredient.inventoryMatch) {
    const hit = byKey(normalizeIngredientName(ingredient.inventoryMatch));
    if (hit) return hit;
  }
  const key = normalizeIngredientName(ingredient.name);
  const exact = byKey(key);
  if (exact) return exact;

  const words = new Set(key.split(' '));
  return keyed.find(({ key: k }) => {
    const itemWords = k.split(' ');
    return itemWords.every((w) => words.has(w)) || [...words].every((w) => itemWords.includes(w));
  })?.item;
}

export function statusOf(ingredient: IngredientLike, inventory: InventoryItem[]): RecipeIngredientStatus {
  const item = findInInventory(ingredient, inventory);
  if (!item) return 'unknown';
  if (item.stockLevel === 'out') return 'missing';
  if (item.stockLevel === 'low') return 'low';
  return 'available';
}

/** Ajoute le statut et corrige `inventoryMatch` pour qu'il désigne un vrai ingrédient de l'inventaire. */
export function annotateIngredients<T extends IngredientLike>(ingredients: T[], inventory: InventoryItem[]) {
  return ingredients.map((ingredient) => {
    const item = findInInventory(ingredient, inventory);
    return {
      ...ingredient,
      inventoryMatch: item?.name ?? null,
      status: statusOf(ingredient, inventory),
    };
  });
}

/**
 * Indicateur « 4/5 ingrédients » : seuls les ingrédients indispensables comptent
 * (les facultatifs et les basiques du placard ne pénalisent jamais une recette).
 */
export function computeAvailability(
  ingredients: (IngredientLike & { status: RecipeIngredientStatus })[],
) {
  const required = ingredients.filter((i) => !i.optional && !i.staple);
  return {
    available: required.filter((i) => i.status === 'available' || i.status === 'low').length,
    required: required.length,
    missing: required.filter((i) => i.status === 'missing').map((i) => i.name),
    unknown: required.filter((i) => i.status === 'unknown').map((i) => i.name),
  };
}
