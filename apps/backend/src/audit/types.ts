// apps/backend/src/audit/types.ts
export type AuditAction =
  | 'login' | 'login_failed' | 'logout' | 'register'
  | 'service_restart' | 'service_stop'
  | 'deploy' | 'rollback'
  | 'user_approve' | 'user_role_change' | 'user_disable' | 'user_enable' | 'user_delete';
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
