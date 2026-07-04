// apps/backend/src/deploy/deploy.service.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import Docker from 'dockerode';
import { Deployment } from './deployment.entity';
import { DeployEvent, DeployKind } from './types';
import { RECREATOR, Recreator } from './recreator';
import { ContainersService } from '../containers/containers.service';
import { AppException } from '../common/app-exception';
import { TagService } from './tag.service';
import { AuditService } from '../audit/audit.service';

interface DeployCfg { gameRepo: string; dbRepo: string; }
const GAME_ROLES = new Set(['auth', 'channel', 'quest-compiler']);
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
    private readonly docker: Docker,
    private readonly audit: AuditService,
  ) {}

  private repoFor(kind: DeployKind): string {
    return kind === 'game' ? this.cfg.gameRepo : this.cfg.dbRepo;
  }

  async startDeploy(kind: DeployKind, tag: string, userId: string): Promise<{ jobId: string }> {
    if (this.active) throw new AppException('deploy_in_progress', HttpStatus.CONFLICT, 'Devam eden bir deploy var');
    const { game, db, currentGame, currentDb } = await this.tagService.listTags();
    const list = kind === 'game' ? game : db;
    const current = kind === 'game' ? currentGame : currentDb;
    if (!list.find((t) => t.name === tag && t.deployable)) throw new AppException('invalid_tag', HttpStatus.BAD_REQUEST, `Geçersiz/eksik tag: ${tag}`);
    const dep = await this.repo.save({ kind, toTag: tag, fromTag: current, userId, status: 'running' } as any);
    const subject = new Subject<DeployEvent>();
    this.active = { jobId: dep.id, subject };
    void this.run(dep.id, kind, tag, current, subject);
    return { jobId: dep.id };
  }

  async deleteImage(kind: DeployKind, tag: string, actor: { sub?: string; id?: string; username: string }) {
    const ref = `${this.repoFor(kind)}:${tag}`;
    const userId = actor.id ?? actor.sub ?? null;
    try {
      await this.docker.getImage(ref).remove();
    } catch (e: any) {
      if (e?.statusCode === 409) {
        await this.audit
          .record({ action: 'image_delete', result: 'failure', userId, username: actor.username, target: `${kind}:${tag}`, detail: { reason: 'in-use' } })
          .catch(() => {});
        throw new AppException('image_in_use', HttpStatus.CONFLICT, 'Image kullanımda, silinemez');
      }
      await this.audit
        .record({ action: 'image_delete', result: 'failure', userId, username: actor.username, target: `${kind}:${tag}`, detail: { reason: 'error' } })
        .catch(() => {});
      throw e;
    }
    await this.audit
      .record({ action: 'image_delete', result: 'success', userId, username: actor.username, target: `${kind}:${tag}` })
      .catch(() => {});
    return { deleted: `${kind}:${tag}` };
  }

  streamJob(jobId: string): Observable<DeployEvent> {
    if (!this.active || this.active.jobId !== jobId) {
      const s = new Subject<DeployEvent>(); queueMicrotask(() => s.complete()); return s.asObservable();
    }
    return this.active.subject.asObservable();
  }

  private async cardsForKind(kind: DeployKind) {
    const cards = await this.containers.discoverServices();
    const repo = this.repoFor(kind);
    if (kind === 'game') {
      return cards.filter((c: any) => GAME_ROLES.has(c.role) && c.image?.name === repo);
    }
    // db: bu repo'nun image'ini taşıyan konteyner(ler) — role'den bağımsız.
    return cards.filter((c: any) => c.image?.name === repo);
  }

  private async run(jobId: string, kind: DeployKind, tag: string, fromTag: string | null, s: Subject<DeployEvent>) {
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
      const cards = await this.cardsForKind(kind);
      s.next({ type: 'step', step: 'recreate', status: 'start' });
      for (const c of cards) {
        await this.recreator.recreate(c.name, `${c.image.name}:${tag}`, log);
        recreated.push({ name: c.name, repo: c.image.name });
      }
      s.next({ type: 'step', step: 'recreate', status: 'ok' });

      s.next({ type: 'step', step: 'healthcheck', status: 'start' });
      await this.waitHealthy(recreated.map((r) => r.name), s);
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

  private async waitHealthy(names: string[], s: Subject<DeployEvent>) {
    // Bu deploy'da recreate edilen konteynerler için healthcheck (healthcheck yoksa 'none' → geç).
    for (const name of names) {
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
