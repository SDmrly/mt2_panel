// apps/frontend/src/types/log.ts
export type LogLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'unknown';
export interface LogMessage {
  containerName: string;
  timestamp: string | null;
  component: string | null;
  level: LogLevel;
  location: string | null;
  message: string;
  raw: string;
}
