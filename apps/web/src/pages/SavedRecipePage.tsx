import { Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { BackButton } from '../components/BackButton';
import { RecipeView } from '../components/RecipeView';
import { useCookingMutations } from '../hooks/useCooking';
import { useCookbookMutations, useSavedRecipe } from '../hooks/useRecipes';

export function SavedRecipePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data, isLoading, error } = useSavedRecipe(id);
  const { remove } = useCookbookMutations();
  const { start } = useCookingMutations();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackButton fallback="/recettes" />
        {data && (
          <button
            onClick={() => {
              if (confirm('Retirer cette recette de ton livre ?')) {
                remove.mutate(id, { onSuccess: () => navigate('/recettes', { replace: true }) });
              }
            }}
            className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-tomato-dark hover:bg-tomato-soft"
          >
            <Trash2 size={18} /> Retirer
          </button>
        )}
      </div>
      {isLoading && <p className="text-center text-sm text-muted">Chargement…</p>}
      {error && <p className="text-center text-sm text-tomato-dark">{error.message}</p>}
      {data && (
        <RecipeView
          recipe={data.recipe}
          cookPending={start.isPending}
          onCook={(servings) =>
            start.mutate({ recipe: data.recipe, servings }, { onSuccess: (s) => navigate(`/cuisine/${s.id}`) })
          }
        />
      )}
    </>
  );
}
