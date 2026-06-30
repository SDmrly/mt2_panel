// apps/backend/src/audit/types.ts
export type AuditAction =
  | 'login' | 'login_failed' | 'logout'
  | 'service_restart' | 'service_stop'
  | 'deploy' | 'rollback';
export type AuditResult = 'success' | 'failure';
export interface AuditEntry {
  action: AuditAction;
  result: AuditResult;
  userId?: string | null;
  username?: string | null;
  target?: string | null;
  ip?: string | null;
  detail?: Record<string, unknown> | null;
}
