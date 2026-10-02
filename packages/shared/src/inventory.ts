import { z } from 'zod';

/**
 * Niveau de stock déclaré par l'utilisateur pour un ingrédient de son inventaire.
 *
 * Un ingrédient présent dans l'inventaire est « disponible » sauf s'il est marqué `out`.
 * Un ingrédient absent de l'inventaire n'est PAS considéré comme manquant :
 * sa disponibilité est « inconnue » (cf. `IngredientStatus`).
 */
export const STOCK_LEVELS = ['plenty', 'some', 'low', 'out'] as const;
export const stockLevelSchema = z.enum(STOCK_LEVELS);
export type StockLevel = z.infer<typeof stockLevelSchema>;

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  plenty: 'Beaucoup',
  some: 'En stock',
  low: 'Presque fini',
  out: 'Plus du tout',
};

/** Statut d'un ingrédient du point de vue d'une recette. */
export const INGREDIENT_STATUSES = ['available', 'missing', 'unknown'] as const;
export type IngredientStatus = (typeof INGREDIENT_STATUSES)[number];

/** Catégories proposées à l'utilisateur ; le champ reste libre et facultatif. */
export const SUGGESTED_CATEGORIES = [
  'Fruits & légumes',
  'Viandes & poissons',
  'Produits laitiers',
  'Féculents',
  'Épicerie',
  'Épices & condiments',
  'Surgelés',
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const inventoryItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  stockLevel: stockLevelSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

/** Seul le nom est obligatoire : tout le reste est facultatif. */
export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(80),
  quantity: z.number().positive().max(100_000).nullable().optional(),
  unit: optionalText(20),
  category: optionalText(40),
  stockLevel: stockLevelSchema.optional(),
});
export type CreateInventoryItemInput = z.input<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.input<typeof updateInventoryItemSchema>;

/** Ajout rapide : « carottes, poulet, riz » → trois ingrédients. */
export const quickAddSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export function splitQuickAdd(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 80) continue;
    const key = normalizeIngredientName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Clé de dédoublonnage : « Carottes », « carotte » et « CAROTTES » désignent le même ingrédient.
 * Volontairement simple (minuscules, sans accents, pluriel en s/x retiré).
 */
export function normalizeIngredientName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word.length > 3 ? word.replace(/[sx]$/, '') : word))
    .join(' ');
}
