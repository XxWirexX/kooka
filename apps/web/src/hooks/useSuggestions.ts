import type { Suggestion, SuggestionFilters, SuggestionsResponse } from '@kooka/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { readJson, useStoredState, writeJson } from '../lib/storage';
import { useInventory } from './useInventory';

export const DEFAULT_FILTERS: SuggestionFilters = { maxMinutes: null, cuisine: null, ignoreInventory: false };

/** Filtres conservés entre les visites, jusqu'à ce que l'utilisateur les change. */
export function useFilters() {
  return useStoredState<SuggestionFilters>('local', 'kooka:filters', DEFAULT_FILTERS);
}

/** Suggestions du moment. « Autres idées » passe à la série suivante en excluant les titres déjà vus. */
export function useSuggestions(filters: SuggestionFilters) {
  const { data: inventory, isSuccess } = useInventory();
  const [session, setSession] = useStoredState('session', 'kooka:suggestion-session', {
    filtersKey: '',
    round: 0,
    seen: [] as string[],
  });

  const filtersKey = JSON.stringify(filters);
  const current = session.filtersKey === filtersKey ? session : { filtersKey, round: 0, seen: [] };
  const inventoryKey = (inventory ?? []).map((i) => `${i.name}:${i.stockLevel}`).join('|');

  const query = useQuery({
    queryKey: ['suggestions', filtersKey, filters.ignoreInventory ? '' : inventoryKey, current.round],
    queryFn: async () => {
      const res = await api<SuggestionsResponse>('/suggestions', {
        method: 'POST',
        json: { filters, exclude: current.seen },
      });
      for (const s of res.suggestions) rememberSuggestion(s);
      return res.suggestions;
    },
    enabled: isSuccess,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

  const more = () => {
    const titles = query.data?.map((s) => s.title) ?? [];
    setSession({ filtersKey, round: current.round + 1, seen: [...current.seen, ...titles].slice(-60) });
  };

  return { ...query, more, inventoryCount: inventory?.filter((i) => i.stockLevel !== 'out').length ?? 0 };
}

export function rememberSuggestion(s: Suggestion) {
  writeJson('session', `kooka:suggestion:${s.id}`, s);
}

export function recallSuggestion(id: string): Suggestion | null {
  return readJson<Suggestion | null>('session', `kooka:suggestion:${id}`, null);
}
