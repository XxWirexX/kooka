import { z } from 'zod';

export const DEFAULT_STAPLES = ['sel', 'poivre', "huile d'olive", 'beurre', 'farine', 'sucre', 'ail', 'oignon'];

export const COOKING_TIME_LABELS = {
  quick: 'Rapide (moins de 30 min)',
  normal: 'Normal',
  relaxed: "J'ai le temps",
} as const;
export const SKILL_LABELS = {
  beginner: 'Débutant',
  intermediate: 'À l’aise',
  advanced: 'Confirmé',
} as const;
export const ADVENTURE_LABELS = {
  classic: 'Des classiques',
  balanced: 'Un peu des deux',
  adventurous: 'Surprends-moi',
} as const;
export const DISHES_LABELS = {
  minimal: 'Le moins possible',
  normal: 'Peu importe',
} as const;

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const tagList = z.array(z.string().trim().min(1).max(40)).max(30);

export const preferencesSchema = z.object({
  servings: z.number().int().min(1).max(12),
  cookingTime: z.enum(keys(COOKING_TIME_LABELS)),
  skill: z.enum(keys(SKILL_LABELS)),
  adventure: z.enum(keys(ADVENTURE_LABELS)),
  dishes: z.enum(keys(DISHES_LABELS)),
  favoriteCuisines: tagList,
  likes: tagList,
  avoid: tagList,
  /** Instructions libres : personnalisent les réponses sans pouvoir contourner les règles. */
  instructions: z.string().trim().max(600),
  /** L'utilisateur a les basiques du placard : ils comptent comme disponibles. */
  hasStaples: z.boolean(),
  staples: tagList,
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  servings: 2,
  cookingTime: 'normal',
  skill: 'intermediate',
  adventure: 'balanced',
  dishes: 'normal',
  favoriteCuisines: [],
  likes: [],
  avoid: [],
  instructions: '',
  hasStaples: true,
  staples: DEFAULT_STAPLES,
};

export const updatePreferencesSchema = preferencesSchema.partial();
