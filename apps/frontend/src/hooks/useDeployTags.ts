// apps/frontend/src/hooks/useDeployTags.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { DeployTags } from '../types/deploy';
export function useDeployTags() {
  return useQuery({
    queryKey: ['deploy-tags'],
    queryFn: async () => (await apiClient.get<DeployTags>('/deploy/tags')).data,
  });
}
