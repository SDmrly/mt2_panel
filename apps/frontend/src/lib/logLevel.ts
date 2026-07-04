// apps/frontend/src/lib/logLevel.ts
import { LogLevel } from '../types/log';
export function levelColor(level: LogLevel): string {
  switch (level) {
    case 'fatal':
    case 'error': return 'text-red-400';
    case 'warning': return 'text-amber-400';
    case 'debug': return 'text-slate-400';
    case 'info': return 'text-sky-300';
    default: return 'text-slate-300';
  }
}
