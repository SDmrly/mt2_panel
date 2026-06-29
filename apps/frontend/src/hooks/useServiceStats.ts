// apps/frontend/src/hooks/useServiceStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useServiceStats(name: string) {
  return useQuery({
    queryKey: ['service-stats', name],
    queryFn: async () => (await apiClient.get(`/services/${name}/stats`)).data,
    refetchInterval: 2000,
    enabled: !!name,
  });
}
