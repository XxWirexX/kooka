import type { CreateInventoryItemInput, InventoryItem, UpdateInventoryItemInput } from '@kooka/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const KEY = ['inventory'] as const;

export function useInventory() {
  return useQuery({ queryKey: KEY, queryFn: () => api<InventoryItem[]>('/inventory') });
}

export function useInventoryMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    quickAdd: useMutation({
      mutationFn: (text: string) =>
        api<InventoryItem[]>('/inventory/quick-add', { method: 'POST', json: { text } }),
      onSuccess,
    }),
    add: useMutation({
      mutationFn: (input: CreateInventoryItemInput) =>
        api<InventoryItem>('/inventory', { method: 'POST', json: input }),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateInventoryItemInput & { id: number }) =>
        api<InventoryItem>(`/inventory/${id}`, { method: 'PATCH', json: input }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api<void>(`/inventory/${id}`, { method: 'DELETE' }),
      onSuccess,
    }),
  };
}
