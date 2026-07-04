// apps/backend/src/deploy/tag.service.ts
import { Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import { TagInfo } from './types';

interface DeployCfg { gameRepo: string; dbRepo: string; }

@Injectable()
export class TagService {
  constructor(private readonly docker: Docker, private readonly cfg: DeployCfg, private readonly project: string) {}

  private tagsFor(images: any[], repo: string): Set<string> {
    const set = new Set<string>();
    for (const img of images) for (const rt of img.RepoTags ?? []) {
      const i = rt.lastIndexOf(':');
      if (i > 0 && rt.slice(0, i) === repo) set.add(rt.slice(i + 1));
    }
    return set;
  }

  private metaFor(images: any[], repo: string): Map<string, { created: number; size: number }> {
    const map = new Map<string, { created: number; size: number }>();
    for (const img of images) for (const rt of img.RepoTags ?? []) {
      const i = rt.lastIndexOf(':');
      if (i > 0 && rt.slice(0, i) === repo) {
        map.set(rt.slice(i + 1), { created: img.Created ?? 0, size: img.Size ?? 0 });
      }
    }
    return map;
  }

  private buildList(images: any[], repo: string, current: string | null): TagInfo[] {
    const tags = this.tagsFor(images, repo);
    const meta = this.metaFor(images, repo);
    return [...tags].sort().map((name) => {
      const m = meta.get(name);
      const isRunning = name === current;
      return {
        name,
        createdAt: new Date((m?.created ?? 0) * 1000).toISOString(),
        sizeMb: Math.round((m?.size ?? 0) / 1048576),
        isRunning,
        deployable: !isRunning,
      };
    });
  }

  async listTags(): Promise<{ game: TagInfo[]; db: TagInfo[]; currentGame: string | null; currentDb: string | null }> {
    const images = await this.docker.listImages();
    const currentGame = await this.currentTagFor(this.cfg.gameRepo);
    const currentDb = await this.currentTagFor(this.cfg.dbRepo);
    const game = this.buildList(images, this.cfg.gameRepo, currentGame);
    const db = this.buildList(images, this.cfg.dbRepo, currentDb);
    return { game, db, currentGame, currentDb };
  }

  private async currentTagFor(repo: string): Promise<string | null> {
    const list = await this.docker.listContainers({ all: true,
      filters: { label: [`com.docker.compose.project=${this.project}`] } });
    let fallback: string | null = null;
    for (const c of list) {
      const info = await this.docker.getContainer(c.Id).inspect();
      const img: string = info.Config?.Image ?? '';
      if (!img.startsWith(repo + ':')) continue;
      const tag = img.slice(img.lastIndexOf(':') + 1);
      const isRunning = c.State === 'running' || (typeof c.Status === 'string' && c.Status.startsWith('Up'));
      if (isRunning) return tag;
      if (fallback === null) fallback = tag;
    }
    return fallback;
  }
}
