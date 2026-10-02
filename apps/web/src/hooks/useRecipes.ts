import type { Recipe, SavedRecipe, Suggestion } from '@kooka/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useGeneratedRecipe(suggestion: Suggestion | null, ignoreInventory: boolean) {
  return useQuery({
    queryKey: ['recipe', suggestion?.id],
    queryFn: () =>
      api<Recipe>('/recipes/generate', {
        method: 'POST',
        json: { suggestion, servings: 2, ignoreInventory },
      }),
    enabled: suggestion !== null,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}

const COOKBOOK = ['cookbook'] as const;

export function useCookbook() {
  return useQuery({ queryKey: COOKBOOK, queryFn: () => api<SavedRecipe[]>('/cookbook') });
}

export function useSavedRecipe(id: number) {
  return useQuery({ queryKey: [...COOKBOOK, id], queryFn: () => api<SavedRecipe>(`/cookbook/${id}`) });
}

export function useCookbookMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: COOKBOOK });
  return {
    save: useMutation({
      mutationFn: (recipe: Recipe) => api<SavedRecipe>('/cookbook', { method: 'POST', json: { recipe } }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api<void>(`/cookbook/${id}`, { method: 'DELETE' }),
      onSuccess,
    }),
  };
}
