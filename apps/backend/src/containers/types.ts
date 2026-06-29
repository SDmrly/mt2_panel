// apps/backend/src/containers/types.ts
export type ServiceRole = 'database' | 'db-process' | 'auth' | 'channel' | 'proxy' | 'quest-compiler';
export type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'exited';
export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';

export interface ServiceStats {
  cpuPercent: number; memUsedMb: number; memLimitMb: number;
  networkRxMb: number; networkTxMb: number;
}
export interface ServiceCard {
  name: string; role: ServiceRole; channel?: number;
  status: ServiceStatus; health: ServiceHealth; uptime: string;
  image: { name: string; tag: string }; ports: string[];
  stats?: ServiceStats;
  exitCode?: number; finishedAt?: string; questLogAvailable?: boolean;
}
