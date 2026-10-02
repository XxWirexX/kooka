import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { BackButton } from '../components/BackButton';
import { RecipeView } from '../components/RecipeView';
import { useCookingMutations } from '../hooks/useCooking';
import { usePreferences } from '../hooks/usePreferences';
import { useCookbookMutations, useGeneratedRecipe } from '../hooks/useRecipes';
import { recallSuggestion, useFilters } from '../hooks/useSuggestions';

/** Fiche recette générée à partir d'une suggestion. */
export function RecipePage() {
  const { id = '' } = useParams();
  const [filters] = useFilters();
  const suggestion = recallSuggestion(id);
  const discovery = filters.ignoreInventory ?? false;
  const { preferences, isSuccess: prefsLoaded } = usePreferences();
  const { data: recipe, isLoading, error, refetch } = useGeneratedRecipe(
    suggestion,
    discovery,
    prefsLoaded ? preferences.servings : null,
  );
  const { save } = useCookbookMutations();
  const { start } = useCookingMutations();
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackButton fallback="/" />
        {recipe && (
          <button
            onClick={() => save.mutate(recipe)}
            disabled={save.isPending || save.isSuccess}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${
              save.isSuccess ? 'bg-basil-soft text-basil' : 'bg-tomato text-cream'
            }`}
          >
            {save.isSuccess ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            {save.isSuccess ? 'Sauvegardée' : 'Sauvegarder'}
          </button>
        )}
      </div>

      {!suggestion && <p className="text-center text-sm text-muted">Cette suggestion n'est plus disponible.</p>}

      {suggestion && (isLoading || !prefsLoaded) && (
        <div className="rounded-3xl bg-tomato-soft p-6 text-center">
          <span className="inline-block animate-bounce text-5xl">{suggestion.emoji}</span>
          <h1 className="mt-3 font-display text-2xl font-bold">{suggestion.title}</h1>
          <p className="mt-2 text-sm text-muted">Kooka rédige ta recette, quantités et étapes comprises…</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-tomato-soft bg-surface p-6 text-center">
          <p className="text-sm text-tomato-dark">{error.message}</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-tomato-dark underline">
            Réessayer
          </button>
        </div>
      )}

      {recipe && (
        <RecipeView
          recipe={recipe}
          showStatus={!discovery}
          cookPending={start.isPending}
          onCook={(servings) =>
            start.mutate({ recipe, servings }, { onSuccess: (s) => navigate(`/cuisine/${s.id}`) })
          }
        />
      )}
    </>
  );
}
