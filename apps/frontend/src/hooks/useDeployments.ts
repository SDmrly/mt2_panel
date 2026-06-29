// apps/frontend/src/hooks/useDeployments.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Deployment } from '../types/deploy';
export function useDeployments() {
  return useQuery({
    queryKey: ['deployments'],
    queryFn: async () => (await apiClient.get<Deployment[]>('/deployments')).data,
    refetchInterval: 5000,
  });
}
