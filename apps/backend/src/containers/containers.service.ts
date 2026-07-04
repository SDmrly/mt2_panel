// apps/backend/src/containers/containers.service.ts
import { HttpStatus } from '@nestjs/common';
import Docker from 'dockerode';
import { AppException } from '../common/app-exception';
import { resolveRole } from './service-role';
import { ServiceCard, ServiceHealth, ServiceStats, ServiceStatus } from './types';

export class ContainersService {
  private cache?: { at: number; data: ServiceCard[] };
  private static TTL = 5000;
  constructor(private readonly docker: Docker, private readonly project: string) {}

  private parseEnv(env: string[] = []): Record<string, string> {
    return Object.fromEntries(
      env.map((e) => {
        const i = e.indexOf('=');
        return [e.slice(0, i), e.slice(i + 1)];
      }),
    );
  }

  private mapHealth(h?: string): ServiceHealth {
    if (h === 'healthy') return 'healthy';
    if (h === 'unhealthy') return 'unhealthy';
    if (h === 'starting') return 'starting';
    return 'none';
  }

  private mapStatus(s: string): ServiceStatus {
    if (s === 'running') return 'running';
    if (s === 'restarting') return 'restarting';
    if (s === 'exited') return 'exited';
    return 'stopped';
  }

  async findContainerByService(name: string) {
    const list = await this.docker.listContainers({
      all: true,
      filters: {
        label: [
          `com.docker.compose.project=${this.project}`,
          `com.docker.compose.service=${name}`,
        ],
      },
    });
    if (!list[0]) throw new AppException('service_not_found', HttpStatus.NOT_FOUND, `Servis bulunamadı: ${name}`);
    return this.docker.getContainer(list[0].Id);
  }

  async discoverServices(): Promise<ServiceCard[]> {
    if (this.cache && Date.now() - this.cache.at < ContainersService.TTL) {
      return this.cache.data;
    }
    const list = await this.docker.listContainers({ all: true });
    const mine = list.filter(
      (c) => c.Labels?.['com.docker.compose.project'] === this.project,
    );
    const cards = await Promise.all(
      mine.map(async (c) => {
        const service =
          c.Labels['com.docker.compose.service'] ??
          c.Names[0].replace('/', '');
        const insp: any = await this.docker.getContainer(c.Id).inspect();
        const env = this.parseEnv(insp.Config?.Env);
        const role = resolveRole(service, env['MT2_ROLE']);
        const [imgName, imgTag] = (insp.Config?.Image ?? c.Image).split(':');
        const card: ServiceCard = {
          name: service,
          role,
          channel: role === 'channel' ? Number(env['CHANNEL'] ?? 0) : undefined,
          status: this.mapStatus(c.State),
          health: this.mapHealth(insp.State?.Health?.Status),
          uptime: c.Status,
          image: { name: imgName, tag: imgTag ?? 'latest' },
          ports: (c.Ports ?? []).map((p) => `${p.PrivatePort}/${p.Type}`),
        };
        if (role === 'quest-compiler') {
          card.exitCode = insp.State?.ExitCode;
          card.finishedAt = insp.State?.FinishedAt;
          card.questLogAvailable = true;
        }
        return card;
      }),
    );
    this.cache = { at: Date.now(), data: cards };
    return cards;
  }

  async getStats(name: string): Promise<ServiceStats> {
    const c = await this.findContainerByService(name);
    const s: any = await c.stats({ stream: false });
    const cpuDelta =
      s.cpu_stats.cpu_usage.total_usage -
      s.precpu_stats.cpu_usage.total_usage;
    const sysDelta =
      s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
    const cpus = s.cpu_stats.online_cpus ?? 1;
    const cpuPercent =
      sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0;
    const net = Object.values(s.networks ?? {}) as any[];
    return {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memUsedMb: Math.round((s.memory_stats.usage ?? 0) / 1048576),
      memLimitMb: Math.round((s.memory_stats.limit ?? 0) / 1048576),
      networkRxMb: Number(
        (
          net.reduce((a, n) => a + (n.rx_bytes ?? 0), 0) / 1048576
        ).toFixed(2),
      ),
      networkTxMb: Number(
        (
          net.reduce((a, n) => a + (n.tx_bytes ?? 0), 0) / 1048576
        ).toFixed(2),
      ),
    };
  }

  async getHealth(name: string) {
    const insp: any = await (await this.findContainerByService(name)).inspect();
    return {
      status: insp.State?.Health?.Status ?? 'none',
      failingStreak: insp.State?.Health?.FailingStreak ?? 0,
      log: (insp.State?.Health?.Log ?? []).slice(-3),
      exitCode: insp.State?.ExitCode,
      finishedAt: insp.State?.FinishedAt,
    };
  }

  async restart(name: string): Promise<void> {
    await (await this.findContainerByService(name)).restart({ t: 30 });
  }

  async stop(name: string): Promise<void> {
    await (await this.findContainerByService(name)).stop({ t: 30 });
  }
}
