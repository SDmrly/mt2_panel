export type ServiceRole =
  | 'database'
  | 'db-process'
  | 'auth'
  | 'channel'
  | 'proxy'
  | 'quest-compiler';

export interface ServiceCard {
  name: string;
  role: ServiceRole;
  channel?: number;
  status: 'running' | 'stopped' | 'restarting' | 'exited';
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  uptime: string;
  image: { name: string; tag: string };
  ports: string[];
  stats?: {
    cpuPercent: number;
    memUsedMb: number;
    memLimitMb: number;
    networkRxMb: number;
    networkTxMb: number;
  };
  exitCode?: number;
  finishedAt?: string;
  questLogAvailable?: boolean;
}
