// apps/frontend/src/hooks/useAudit.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { AuditLog, AuditFilter } from '../types/audit';
export function useAudit(filter: AuditFilter) {
  return useQuery({
    queryKey: ['audit', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.action) params.set('action', filter.action);
      if (filter.userId) params.set('userId', filter.userId);
      if (filter.username) params.set('username', filter.username);
      if (filter.from) params.set('from', filter.from);
      if (filter.to) params.set('to', filter.to);
      params.set('limit', String(filter.limit ?? 50));
      params.set('offset', String(filter.offset ?? 0));
      return (await apiClient.get<{ rows: AuditLog[]; total: number }>(`/audit?${params.toString()}`)).data;
    },
  });
}
