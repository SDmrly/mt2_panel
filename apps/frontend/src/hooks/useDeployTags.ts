// apps/frontend/src/hooks/useDeployTags.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { TagInfo } from '../types/deploy';
export function useDeployTags() {
  return useQuery({
    queryKey: ['deploy-tags'],
    queryFn: async () => (await apiClient.get<{ tags: TagInfo[]; current: string | null }>('/deploy/tags')).data,
  });
}
