import { STOCK_LEVEL_LABELS, type InventoryItem } from '@kooka/shared';
import type { RecipeContext, SuggestContext } from './provider.js';

const BASE = `Tu es le moteur culinaire de Kooka, une application qui aide à cuisiner avec ce qu'on a chez soi.
Tu t'adresses à l'utilisateur en le tutoyant, en français, sur un ton chaleureux et concis.
Tu proposes uniquement des plats principaux (pas d'entrées ni de desserts).
Tes réponses sont lues sur un téléphone : sois précis sans être long.`;

export const SUGGEST_SYSTEM = `${BASE}

Ta tâche : proposer des idées de plats.
Règles :
- Diversité obligatoire : chaque proposition explore une famille de plat, une technique ET si possible une cuisine différentes (ex. un sauté, un plat mijoté, une salade composée ; jamais trois variantes du même plat).
- Les temps doivent être réalistes, attentes comprises.
- Liste TOUS les ingrédients de chaque plat, en marquant les basiques du placard (staple) et les facultatifs (optional).
- inventoryMatch doit reprendre mot pour mot un nom de l'inventaire fourni, ou valoir null.
- Un ingrédient marqué épuisé n'est PAS disponible.
- Ne propose jamais un plat dont le titre figure dans la liste « déjà proposés ».`;

export const RECIPE_SYSTEM = `${BASE}

Ta tâche : rédiger la fiche recette complète d'un plat choisi par l'utilisateur.
Règles :
- Quantités précises adaptées au nombre de personnes. Pour les ingrédients comptés en pièces, donne aussi le poids approximatif (grams), ex. 2 carottes ≈ 250 g.
- Si la quantité disponible dans l'inventaire est connue et semble insuffisante ou incertaine, dis-le dans tips.
- activeMinutes = temps de travail réel ; passiveMinutes = attentes (marinade, repos, four sans surveillance).
- Les durées des étapes doivent être cohérentes avec ces temps.
- 4 à 10 étapes, chacune faisable sans relire les autres.
- Marque les ingrédients facultatifs et les basiques du placard.
- inventoryMatch doit reprendre mot pour mot un nom de l'inventaire fourni, ou valoir null.
- tips : uniquement des remarques qui apportent une vraie valeur ; liste vide sinon.`;

export function describeInventory(items: InventoryItem[]): string {
  const available = items.filter((i) => i.stockLevel !== 'out');
  const out = items.filter((i) => i.stockLevel === 'out');
  const line = (i: InventoryItem) => {
    const details = [
      i.quantity !== null ? `${i.quantity}${i.unit ? ` ${i.unit}` : ''}` : null,
      i.stockLevel === 'plenty' || i.stockLevel === 'low' ? STOCK_LEVEL_LABELS[i.stockLevel].toLowerCase() : null,
    ].filter(Boolean);
    return `- ${i.name}${details.length ? ` (${details.join(', ')})` : ''}`;
  };
  const parts = [
    available.length ? `Inventaire disponible :\n${available.map(line).join('\n')}` : 'Inventaire vide.',
  ];
  if (out.length) parts.push(`Épuisés (ne pas compter dessus) : ${out.map((i) => i.name).join(', ')}`);
  parts.push(
    "Les ingrédients absents de l'inventaire ont une disponibilité inconnue (l'utilisateur n'a pas tout renseigné, notamment les basiques).",
  );
  return parts.join('\n\n');
}

export function suggestPrompt(ctx: SuggestContext): string {
  const { filters } = ctx;
  const constraints: string[] = [];
  if (filters.maxMinutes) constraints.push(`- Temps total maximum : ${filters.maxMinutes} minutes.`);
  if (filters.cuisine) constraints.push(`- Cuisine souhaitée : ${filters.cuisine}.`);

  const mode = filters.ignoreInventory
    ? "Mode découverte : ignore l'inventaire et propose des plats qui sortent de l'ordinaire."
    : `Construis chaque plat autour des ingrédients disponibles. Un plat peut demander au plus 2 ingrédients indispensables absents de l'inventaire (hors basiques). Privilégie les ingrédients marqués « presque fini ».\n\n${describeInventory(ctx.inventory)}`;

  return [
    `Propose ${ctx.count} idées de plats.`,
    mode,
    constraints.length ? `Contraintes :\n${constraints.join('\n')}` : null,
    ctx.exclude.length ? `Déjà proposés (à ne pas reproposer, ni leurs variantes) : ${ctx.exclude.join(' ; ')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function recipePrompt(ctx: RecipeContext): string {
  const s = ctx.suggestion;
  return [
    `Rédige la recette « ${s.title} » (${s.cuisine}, ${s.difficulty}, environ ${s.totalMinutes} min) pour ${ctx.servings} personne${ctx.servings > 1 ? 's' : ''}.`,
    `Présentation proposée : ${s.pitch}`,
    `Ingrédients envisagés : ${s.ingredients.map((i) => `${i.name}${i.optional ? ' (facultatif)' : ''}`).join(', ')}.`,
    ctx.ignoreInventory ? null : describeInventory(ctx.inventory),
  ]
    .filter(Boolean)
    .join('\n\n');
}
