// apps/frontend/src/lib/logLevel.ts
import { LogLevel } from '../types/log';
export function levelColor(level: LogLevel): string {
  switch (level) {
    case 'fatal':
    case 'error': return 'text-red-600';
    case 'warning': return 'text-yellow-600';
    case 'debug': return 'text-blue-500';
    case 'info': return 'text-gray-800';
    default: return 'text-gray-400';
  }
}
