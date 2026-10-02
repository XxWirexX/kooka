import type { RecipeAI } from './provider.js';
import type { AiRecipe, AiSuggestion } from './schemas.js';

/**
 * Faux fournisseur IA, déterministe : sert aux tests et au développement sans clé API
 * (activé si ANTHROPIC_API_KEY est absente ou si AI_PROVIDER=mock).
 */
export function createMockAI(): RecipeAI {
  return {
    async suggest({ inventory, exclude, count }) {
      const names = inventory.filter((i) => i.stockLevel !== 'out').map((i) => i.name);
      const [a = 'pois chiches', b = 'tomates', c = 'oignon'] = names;
      const templates: AiSuggestion[] = [
        idea(`Poêlée de ${a} et ${b}`, '🍳', 'Française', 'easy', 20, [a, b]),
        idea(`Curry de ${a}`, '🍛', 'Indienne', 'medium', 35, [a, c, 'lait de coco']),
        idea(`Salade tiède de ${b}`, '🥗', 'Méditerranéenne', 'easy', 15, [b, c]),
        idea(`Gratin de ${c}`, '🧀', 'Française', 'medium', 45, [c, 'crème', 'fromage râpé']),
        idea(`Wok de ${a} au gingembre`, '🥢', 'Asiatique', 'easy', 25, [a, 'gingembre', b]),
        idea(`Shakshuka de ${b}`, '🍅', 'Moyen-Orient', 'easy', 30, [b, 'œufs', c]),
      ];
      const seen = new Set(exclude.map((t) => t.toLowerCase()));
      return { suggestions: templates.filter((t) => !seen.has(t.title.toLowerCase())).slice(0, count) };

      function idea(
        title: string,
        emoji: string,
        cuisine: string,
        difficulty: AiSuggestion['difficulty'],
        totalMinutes: number,
        main: string[],
      ): AiSuggestion {
        return {
          title,
          emoji,
          pitch: `Un plat simple et généreux autour de ${main[0]}.`,
          cuisine,
          difficulty,
          totalMinutes,
          reason: `Tu as déjà ${main.filter((m) => names.includes(m)).join(', ') || 'de quoi commencer'}.`,
          ingredients: [
            ...main.map((name) => ({ name, optional: false, staple: false, inventoryMatch: names.includes(name) ? name : null })),
            { name: 'huile d’olive', optional: false, staple: true, inventoryMatch: null },
            { name: 'sel', optional: false, staple: true, inventoryMatch: null },
            { name: 'persil', optional: true, staple: false, inventoryMatch: null },
          ],
        };
      }
    },

    async recipe({ suggestion, servings }): Promise<AiRecipe> {
      return {
        title: suggestion.title,
        emoji: suggestion.emoji,
        description: suggestion.pitch,
        cuisine: suggestion.cuisine,
        difficulty: suggestion.difficulty,
        servings,
        activeMinutes: 15,
        passiveMinutes: Math.max(0, suggestion.totalMinutes - 15),
        ingredients: [
          ...suggestion.ingredients
            .filter((i) => i.name !== 'sel' && !i.name.startsWith('huile'))
            .map((i) => ({
              name: i.name,
              optional: i.optional,
              staple: false,
              inventoryMatch: null,
              amount: i.optional ? null : 100 * servings,
              unit: i.optional ? null : 'g',
              grams: null,
              note: i.optional ? 'quelques brins' : null,
            })),
          { name: 'huile d’olive', optional: false, staple: true, inventoryMatch: null, amount: 1, unit: 'c. à soupe', grams: null, note: null },
          { name: 'sel', optional: false, staple: true, inventoryMatch: null, amount: null, unit: null, grams: null, note: 'une pincée' },
        ],
        steps: [
          { title: 'Préparer', instruction: 'Lave et découpe les ingrédients en morceaux réguliers.', minutes: 10, passive: false },
          { title: 'Saisir', instruction: 'Fais chauffer l’huile à feu vif et fais dorer les ingrédients principaux.', minutes: 5, passive: false },
          { title: 'Laisser cuire', instruction: 'Couvre et laisse cuire à feu doux.', minutes: Math.max(0, suggestion.totalMinutes - 15) || null, passive: true },
          { title: 'Servir', instruction: 'Rectifie l’assaisonnement et sers bien chaud.', minutes: null, passive: false },
        ],
        tips: [],
      };
    },
  };
}
