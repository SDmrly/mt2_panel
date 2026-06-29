// apps/backend/src/containers/service-role.ts
import { ServiceRole } from './types';
export function resolveRole(serviceName: string, mt2Role?: string): ServiceRole {
  const n = serviceName.toLowerCase();
  if (n.includes('database')) return 'database';
  if (n.includes('quest-compiler')) return 'quest-compiler';
  if (n.includes('haproxy')) return 'proxy';
  if (mt2Role === 'db') return 'db-process';
  if (mt2Role === 'auth') return 'auth';
  if (mt2Role === 'core') return 'channel';
  return 'channel';
}
