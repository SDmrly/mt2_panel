export interface ContainerStat {
  name: string;
  role: string;
  status: string;
  cpuPercent: number;
  memPercent: number;
}

export interface SystemOverview {
  cpuPercent: number;
  memUsedMb: number;
  memTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  netRxMbps: number;
  netTxMbps: number;
  containers: ContainerStat[];
}
