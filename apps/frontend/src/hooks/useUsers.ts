import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { PanelUser } from '../types/user';
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get<PanelUser[]>('/users')).data, refetchInterval: 10000 });
}
