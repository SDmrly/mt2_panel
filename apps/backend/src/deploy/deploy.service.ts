// apps/backend/src/deploy/deploy.service.ts
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { Deployment } from './deployment.entity';
import { DeployEvent } from './types';
import { RECREATOR, Recreator } from './recreator';
import { ContainersService } from '../containers/containers.service';
import { TagService } from './tag.service';

interface DeployCfg { gameRepo: string; dbRepo: string; }
const GAME_ROLES = new Set(['auth', 'channel', 'db-process', 'quest-compiler']);
const HEALTH_SERVICES = ['metin2_auth', 'metin2_db'];
const HEALTH_TIMEOUT_MS = 90_000;

@Injectable()
export class DeployService {
  private active: { jobId: string; subject: Subject<DeployEvent> } | null = null;

  constructor(
    private readonly repo: Repository<Deployment>,
    private readonly containers: ContainersService,
    @Inject(RECREATOR) private readonly recreator: Recreator,
    private readonly tagService: TagService,
    private readonly cfg: DeployCfg,
  ) {}

  async startDeploy(tag: string, userId: string): Promise<{ jobId: string }> {
    if (this.active) throw new ConflictException('Devam eden bir deploy var');
    const { tags, current } = await this.tagService.listTags();
    if (!tags.find((t) => t.name === tag && t.deployable)) throw new BadRequestException(`Geçersiz/eksik tag: ${tag}`);
    const dep = await this.repo.save({ toTag: tag, fromTag: current, userId, status: 'running' } as any);
    const subject = new Subject<DeployEvent>();
    this.active = { jobId: dep.id, subject };
    void this.run(dep.id, tag, current, subject);
    return { jobId: dep.id };
  }

  streamJob(jobId: string): Observable<DeployEvent> {
    if (!this.active || this.active.jobId !== jobId) {
      const s = new Subject<DeployEvent>(); queueMicrotask(() => s.complete()); return s.asObservable();
    }
    return this.active.subject.asObservable();
  }

  private async gameCards() {
    const cards = await this.containers.discoverServices();
    return cards.filter((c: any) => GAME_ROLES.has(c.role) &&
      (c.image?.name === this.cfg.gameRepo || c.image?.name === this.cfg.dbRepo));
  }

  private async run(jobId: string, tag: string, fromTag: string | null, s: Subject<DeployEvent>) {
    const log = (line: string) => s.next({ type: 'log', line });
    const finish = async (status: 'success' | 'failed' | 'rolled_back', error?: string) => {
      try {
        await this.repo.update(jobId, { status, error: error ?? null, finishedAt: new Date() });
      } finally {
        this.active = null;
        s.complete();
      }
    };
    const recreated: { name: string; repo: string }[] = [];
    try {
      const cards = await this.gameCards();
      s.next({ type: 'step', step: 'recreate', status: 'start' });
      for (const c of cards) {
        await this.recreator.recreate(c.name, `${c.image.name}:${tag}`, log);
        recreated.push({ name: c.name, repo: c.image.name });
      }
      s.next({ type: 'step', step: 'recreate', status: 'ok' });

      s.next({ type: 'step', step: 'healthcheck', status: 'start' });
      await this.waitHealthy(s);
      s.next({ type: 'step', step: 'healthcheck', status: 'ok' });

      s.next({ type: 'done' });
      await finish('success');
    } catch (err: any) {
      s.next({ type: 'failed', error: String(err?.message ?? err) });
      if (fromTag && recreated.length) {
        try {
          s.next({ type: 'rollback', step: 'recreate', status: 'start' });
          for (const r of recreated) await this.recreator.recreate(r.name, `${r.repo}:${fromTag}`, log);
          s.next({ type: 'rollback', step: 'recreate', status: 'ok' });
          await finish('rolled_back', String(err?.message ?? err));
          return;
        } catch (rb: any) {
          s.next({ type: 'rollback', status: 'error', error: String(rb?.message ?? rb) });
        }
      } else {
        s.next({ type: 'log', line: `rollback atlandı (fromTag=${fromTag ?? 'bilinmiyor'}, recreated=${recreated.length})` });
      }
      await finish('failed', String(err?.message ?? err));
    }
  }

  private async waitHealthy(s: Subject<DeployEvent>) {
    for (const name of HEALTH_SERVICES) {
      const deadline = Date.now() + HEALTH_TIMEOUT_MS;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const h = await this.containers.getHealth(name).catch(() => ({ status: 'none' as const }));
        if (h.status === 'healthy' || h.status === 'none') break;
        if (Date.now() > deadline) throw new Error(`healthcheck timeout: ${name}`);
        s.next({ type: 'log', line: `waiting health ${name}: ${h.status}` });
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
