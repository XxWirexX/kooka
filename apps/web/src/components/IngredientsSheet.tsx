import type { Recipe } from '@kooka/shared';
import { formatQuantity } from '../lib/format';
import { Sheet } from './Sheet';

export function IngredientsSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <Sheet title={`Ingrédients · ${recipe.servings} pers.`} onClose={onClose}>
      <ul className="divide-y divide-line overflow-y-auto px-5 pb-4">
        {recipe.ingredients.map((i) => (
          <li key={i.name} className="flex items-baseline justify-between gap-3 py-3">
            <span className="font-medium first-letter:uppercase">
              {i.name}
              {i.optional && <span className="ml-1 text-xs font-normal text-muted">(facultatif)</span>}
            </span>
            <span className="shrink-0 text-right text-sm text-muted">{formatQuantity(i)}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
