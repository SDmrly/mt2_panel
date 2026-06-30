// apps/frontend/src/types/audit.ts
export type AuditAction =
  | 'login' | 'login_failed' | 'logout'
  | 'service_restart' | 'service_stop' | 'deploy' | 'rollback';
export interface AuditLog {
  id: string; createdAt: string; action: AuditAction;
  userId: string | null; username: string | null; target: string | null;
  result: 'success' | 'failure'; ip: string | null; detail: Record<string, unknown> | null;
}
export interface AuditFilter { action?: string; userId?: string; username?: string; from?: string; to?: string; limit?: number; offset?: number; }
