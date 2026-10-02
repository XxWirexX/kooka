import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../api/client';

const KEY = ['auth'] as const;

export function useAuth() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api<{ required: boolean; authenticated: boolean }>('/auth/me'),
    staleTime: Infinity,
  });

  useEffect(() => {
    const onUnauthorized = () => qc.invalidateQueries({ queryKey: KEY });
    window.addEventListener('kooka:unauthorized', onUnauthorized);
    return () => window.removeEventListener('kooka:unauthorized', onUnauthorized);
  }, [qc]);

  return query;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api('/auth/login', { method: 'POST', json: { password } }),
    onSuccess: () => qc.resetQueries(),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // On oublie toutes les données (inventaire, recettes…) et on affiche l'écran de connexion.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== KEY[0] });
      qc.setQueryData(KEY, { required: true, authenticated: false });
    },
  });
}
