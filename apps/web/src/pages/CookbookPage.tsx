import { DIFFICULTY_LABELS, type Recipe } from '@kooka/shared';
import { BookOpen, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { useCookingHistory, useCookingMutations } from '../hooks/useCooking';
import { useCookbook } from '../hooks/useRecipes';
import { formatMinutes } from '../lib/format';

export function CookbookPage() {
  const { data = [], isLoading } = useCookbook();
  const { data: history = [] } = useCookingHistory();
  const { start } = useCookingMutations();
  const navigate = useNavigate();

  const cookAgain = (recipe: Recipe, servings: number) =>
    start.mutate({ recipe, servings }, { onSuccess: (s) => navigate(`/cuisine/${s.id}`) });

  return (
    <>
      <PageHeader
        title="Mes recettes"
        subtitle={data.length ? `${data.length} recette${data.length > 1 ? 's' : ''} sauvegardée${data.length > 1 ? 's' : ''}` : undefined}
      />
      {!isLoading && data.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-12 text-center text-muted">
          <BookOpen size={32} />
          <p className="mt-3 text-sm">Les recettes que tu sauvegardes apparaîtront ici.</p>
        </div>
      )}
      <ul className="space-y-3">
        {data.map(({ id, recipe }) => (
          <li key={id}>
            <Link to={`/recettes/${id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-tomato-soft text-3xl" aria-hidden>
                {recipe.emoji}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{recipe.title}</p>
                <p className="text-sm text-muted">
                  {recipe.cuisine} · {formatMinutes(recipe.totalMinutes)} · {DIFFICULTY_LABELS[recipe.difficulty]}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-semibold">Déjà cuisinées</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {history.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl" aria-hidden>
                  {s.recipe.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.recipe.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.finishedAt!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
                    {s.servings} pers.
                  </p>
                </div>
                <button
                  onClick={() => cookAgain(s.recipe, s.servings)}
                  disabled={start.isPending}
                  className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-medium"
                >
                  <RotateCcw size={14} /> Refaire
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
