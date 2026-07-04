import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { SystemOverview } from '../types/system';

export function useSystemOverview() {
  return useQuery({
    queryKey: ['system-overview'],
    queryFn: async () => (await apiClient.get<SystemOverview>('/system/overview')).data,
    refetchInterval: 3000,
  });
}
