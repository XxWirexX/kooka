import type { AskInput, AskResponse, CookingSession, Recipe } from '@kooka/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { timerStore } from '../lib/timers';

const KEY = ['cooking'] as const;

export function useActiveCooking() {
  return useQuery({ queryKey: KEY, queryFn: () => api<CookingSession[]>('/cooking') });
}

export function useCookingHistory() {
  return useQuery({ queryKey: [...KEY, 'history'], queryFn: () => api<CookingSession[]>('/cooking/history') });
}

export function useCookingSession(id: number) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api<CookingSession>(`/cooking/${id}`) });
}

export function useCookingMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    start: useMutation({
      mutationFn: (input: { recipe: Recipe; servings: number }) =>
        api<CookingSession>('/cooking', { method: 'POST', json: input }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...patch }: { id: number; currentStep?: number; servings?: number }) =>
        api<CookingSession>(`/cooking/${id}`, { method: 'PATCH', json: patch }),
      // Mise à jour immédiate de l'écran, sans attendre le serveur.
      onMutate: ({ id, ...patch }) => {
        qc.setQueryData<CookingSession>([...KEY, id], (s) => (s ? { ...s, ...patch } : s));
        qc.setQueryData<CookingSession[]>(KEY, (list) => list?.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      },
      onSettled: refresh,
    }),
    finish: useMutation({
      mutationFn: (id: number) => api<CookingSession>(`/cooking/${id}/finish`, { method: 'POST' }),
      onSuccess: (s) => {
        timerStore.stopSession(s.id);
        refresh();
      },
    }),
    abandon: useMutation({
      mutationFn: (id: number) => api<void>(`/cooking/${id}`, { method: 'DELETE' }),
      onSuccess: (_, id) => {
        timerStore.stopSession(id);
        refresh();
      },
    }),
  };
}

export function useAsk(sessionId: number) {
  return useMutation({
    mutationFn: (input: AskInput) =>
      api<AskResponse>(`/cooking/${sessionId}/ask`, { method: 'POST', json: input }),
  });
}
