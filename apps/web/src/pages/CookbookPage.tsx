import { DIFFICULTY_LABELS } from '@kooka/shared';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { useCookbook } from '../hooks/useRecipes';
import { formatMinutes } from '../lib/format';

export function CookbookPage() {
  const { data = [], isLoading } = useCookbook();

  return (
    <>
      <PageHeader title="Mes recettes" subtitle={data.length ? `${data.length} recette${data.length > 1 ? 's' : ''} sauvegardée${data.length > 1 ? 's' : ''}` : undefined} />
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
    </>
  );
}
