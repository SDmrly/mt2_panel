// apps/backend/src/logs/log-parser.ts
import { LogLevel, LogMessage } from './types';

const LINE_RE =
  /^\[(?<ts>[^\]]+)\]\s*\[(?<comp>[^\]]+)\]\s*\[(?<lvl>[^\]]+)\]\s*(?:\[(?<loc>[^\]]+)\]\s*)?(?<msg>.*)$/;

function normalizeLevel(raw: string): LogLevel {
  const l = raw.trim().toLowerCase();
  if (l === 'error' || l === 'err' || l === 'syserr') return 'error';
  if (l === 'warn' || l === 'warning') return 'warning';
  if (l === 'info') return 'info';
  if (l === 'debug') return 'debug';
  if (l === 'fatal' || l === 'critical') return 'fatal';
  return 'unknown';
}

export function parseLogLine(raw: string, containerName: string): LogMessage {
  const m = LINE_RE.exec(raw);
  if (m?.groups) {
    return {
      containerName,
      timestamp: m.groups.ts ?? null,
      component: m.groups.comp ?? null,
      level: normalizeLevel(m.groups.lvl),
      location: m.groups.loc ?? null,
      message: m.groups.msg ?? '',
      raw,
    };
  }
  // gcc/quest fallback
  let level: LogLevel = 'unknown';
  if (/:\s*error:/i.test(raw)) level = 'error';
  else if (/:\s*warning:/i.test(raw)) level = 'warning';
  return { containerName, timestamp: null, component: null, level, location: null, message: raw, raw };
}
