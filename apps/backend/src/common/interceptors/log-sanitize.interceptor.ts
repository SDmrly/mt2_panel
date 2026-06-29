// apps/backend/src/common/interceptors/log-sanitize.interceptor.ts
const SENSITIVE = ['password', 'token', 'secret', 'authorization'];
export function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) =>
    [k, SENSITIVE.includes(k.toLowerCase()) ? '***' : v]));
}
