import { DEFAULT_PREFERENCES, type Preferences } from '@kooka/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const KEY = ['preferences'] as const;

export function usePreferences() {
  const query = useQuery({ queryKey: KEY, queryFn: () => api<Preferences>('/preferences') });
  return { ...query, preferences: query.data ?? DEFAULT_PREFERENCES };
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Preferences>) => api<Preferences>('/preferences', { method: 'PATCH', json: patch }),
    onSuccess: (prefs) => {
      qc.setQueryData(KEY, prefs);
      qc.invalidateQueries({ queryKey: ['cookbook'] });
    },
  });
}
