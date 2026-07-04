// apps/backend/src/system/system.service.ts
import { Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import { ContainersService } from '../containers/containers.service';

export interface SystemOverview {
  cpuPercent: number; memUsedMb: number; memTotalMb: number;
  diskUsedGb: number; diskTotalGb: number; netRxMbps: number; netTxMbps: number;
  containers: { name: string; role: string; status: string; cpuPercent: number; memPercent: number }[];
}

@Injectable()
export class SystemService {
  private prevNet: { rx: number; tx: number; at: number } | null = null;
  private cache?: { at: number; data: SystemOverview };
  private pending?: Promise<SystemOverview>;
  private static TTL = 2500;

  constructor(private readonly docker: Docker, private readonly containers: ContainersService) {}

  async overview(): Promise<SystemOverview> {
    if (this.cache && Date.now() - this.cache.at < SystemService.TTL) {
      return this.cache.data;
    }
    if (this.pending) return this.pending;
    this.pending = this.computeOverview()
      .then((data) => {
        this.cache = { at: Date.now(), data };
        this.pending = undefined;
        return data;
      })
      .catch((err) => {
        this.pending = undefined;
        throw err;
      });
    return this.pending;
  }

  private async computeOverview(): Promise<SystemOverview> {
    const cards = await this.containers.discoverServices();
    const info: any = await this.docker.info().catch(() => ({ MemTotal: 0, NCPU: 1 }));
    // MemTotal bilinmiyorsa (0/hata) memTotalMb 0 kalır; memPercent hesaplarken absürt değer üretmemek için guard var.
    const memTotalMb = info.MemTotal ? Math.round(info.MemTotal / 1048576) : 0;

    let cpuSum = 0, memSum = 0, rx = 0, tx = 0;
    const containers = await Promise.all(cards.map(async (c: any) => {
      if (c.status !== 'running') return { name: c.name, role: c.role, status: c.status, cpuPercent: 0, memPercent: 0 };
      const s = await this.containers.getStats(c.name).catch(() => null);
      const cpu = s?.cpuPercent ?? 0; const mem = s?.memUsedMb ?? 0;
      cpuSum += cpu; memSum += mem; rx += s?.networkRxMb ?? 0; tx += s?.networkTxMb ?? 0;
      return {
        name: c.name, role: c.role, status: c.status,
        cpuPercent: Number(cpu.toFixed(1)),
        memPercent: memTotalMb > 0 ? Number(((mem / memTotalMb) * 100).toFixed(1)) : 0,
      };
    }));

    const df: any = await this.docker.df().catch(() => ({ LayersSize: 0 }));
    const diskUsedGb = Number(((df.LayersSize ?? 0) / 1073741824).toFixed(1));

    const now = Date.now();
    let netRxMbps = 0, netTxMbps = 0;
    if (this.prevNet) {
      const dt = (now - this.prevNet.at) / 1000; // seconds
      if (dt > 0) {
        netRxMbps = Math.max(0, (rx - this.prevNet.rx) / dt);
        netTxMbps = Math.max(0, (tx - this.prevNet.tx) / dt);
      }
    }
    this.prevNet = { rx, tx, at: now };

    return {
      // Host çekirdek sayısına normalize edilir: her konteyner 0..100 raporlar, toplam NCPU ile bölünüp 0..100'e clamp edilir.
      cpuPercent: Number(Math.min(100, cpuSum / (info.NCPU ?? 1)).toFixed(1)),
      memUsedMb: Math.round(memSum), memTotalMb,
      diskUsedGb, diskTotalGb: 0, // diskTotalGb host'tan alınamıyorsa 0 (UI "Docker disk" gösterir)
      netRxMbps: Number(netRxMbps.toFixed(2)), netTxMbps: Number(netTxMbps.toFixed(2)),
      containers,
    };
  }
}
