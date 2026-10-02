import {
  DIFFICULTY_LABELS,
  scaleRecipe,
  type Recipe,
  type RecipeIngredient,
  type RecipeIngredientStatus,
} from '@kooka/shared';
import { ChefHat, Clock, Gauge, Hourglass, Lightbulb, Minus, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { formatMinutes, formatQuantity } from '../lib/format';

const STATUS: Record<RecipeIngredientStatus, { label: string; className: string }> = {
  available: { label: 'Dispo', className: 'bg-basil-soft text-basil' },
  low: { label: 'Presque fini', className: 'bg-saffron-soft text-saffron' },
  missing: { label: 'Épuisé', className: 'bg-tomato-soft text-tomato-dark' },
  unknown: { label: 'À vérifier', className: 'bg-line/70 text-muted' },
};

interface Props {
  recipe: Recipe;
  showStatus?: boolean;
  /** Lance le mode cuisine avec le nombre de personnes choisi. */
  onCook?: (servings: number) => void;
  cookPending?: boolean;
}

export function RecipeView({ recipe: original, showStatus = true, onCook, cookPending }: Props) {
  const [servings, setServings] = useState(original.servings);
  const recipe = scaleRecipe(original, servings);
  const required = recipe.ingredients.filter((i) => !i.optional);
  const optional = recipe.ingredients.filter((i) => i.optional);

  return (
    <article>
      <header className="rounded-3xl bg-tomato-soft p-5">
        <span className="text-5xl" aria-hidden>
          {recipe.emoji}
        </span>
        <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">{recipe.cuisine}</p>
        <h1 className="font-display text-2xl leading-tight font-bold">{recipe.title}</h1>
        <p className="mt-2 text-sm">{recipe.description}</p>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={<Clock size={18} />} label="Total" value={formatMinutes(recipe.totalMinutes)} />
        <Stat
          icon={<Hourglass size={18} />}
          label="Actif"
          value={formatMinutes(recipe.activeMinutes)}
          hint={recipe.passiveMinutes ? `+ ${formatMinutes(recipe.passiveMinutes)} d'attente` : undefined}
        />
        <Stat icon={<Gauge size={18} />} label="Niveau" value={DIFFICULTY_LABELS[recipe.difficulty]} />
      </dl>

      {onCook && (
        <div className="mt-4">
          <button
            onClick={() => onCook(servings)}
            disabled={cookPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-tomato py-4 font-semibold text-cream shadow-lg shadow-tomato/30 disabled:opacity-60"
          >
            <ChefHat size={20} /> Cuisiner cette recette
          </button>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Ingrédients</h2>
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="grid size-8 place-items-center rounded-full hover:bg-cream"
              aria-label="Une personne de moins"
            >
              <Minus size={16} />
            </button>
            <span className="flex min-w-14 items-center justify-center gap-1 text-sm font-semibold">
              <Users size={15} /> {servings}
            </span>
            <button
              onClick={() => setServings((s) => Math.min(12, s + 1))}
              className="grid size-8 place-items-center rounded-full hover:bg-cream"
              aria-label="Une personne de plus"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <IngredientList items={required} showStatus={showStatus} />
        {optional.length > 0 && (
          <>
            <h3 className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Facultatif</h3>
            <IngredientList items={optional} showStatus={showStatus} />
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold">Étapes</h2>
        <ol className="space-y-3">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tomato text-sm font-bold text-cream">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{step.title}</h3>
                  {step.minutes !== null && (
                    <span className={`shrink-0 text-xs font-medium ${step.passive ? 'text-saffron' : 'text-muted'}`}>
                      {step.passive ? '⏳ ' : ''}
                      {formatMinutes(step.minutes)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed">{step.instruction}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips.length > 0 && (
        <section className="mt-8 rounded-2xl bg-saffron-soft p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb size={18} className="text-saffron" /> Le conseil de Kooka
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

    </article>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3">
      <dt className="flex items-center justify-center gap-1 text-xs text-muted">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
      {hint && <dd className="text-[11px] leading-tight text-muted">{hint}</dd>}
    </div>
  );
}

function IngredientList({ items, showStatus }: { items: RecipeIngredient[]; showStatus: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium first-letter:uppercase">{i.name}</p>
            <p className="text-sm text-muted">{formatQuantity(i)}</p>
          </div>
          {showStatus &&
            (i.staple && i.status === 'unknown' ? (
              <span className="text-xs text-muted">Basique</span>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS[i.status].className}`}>
                {STATUS[i.status].label}
              </span>
            ))}
        </li>
      ))}
    </ul>
  );
}
