// apps/frontend/src/hooks/useServices.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { ServiceCard } from '../types/service';
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => (await apiClient.get<ServiceCard[]>('/services')).data,
    refetchInterval: 5000, staleTime: 3000,
  });
}
