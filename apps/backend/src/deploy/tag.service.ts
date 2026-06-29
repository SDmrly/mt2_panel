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

  async listTags(): Promise<{ tags: TagInfo[]; current: string | null }> {
    const images = await this.docker.listImages();
    const gameTags = this.tagsFor(images, this.cfg.gameRepo);
    const dbTags = this.tagsFor(images, this.cfg.dbRepo);
    const tags: TagInfo[] = [...gameTags].sort().map((name) => ({ name, deployable: dbTags.has(name) }));
    return { tags, current: await this.currentTag() };
  }

  private async currentTag(): Promise<string | null> {
    const list = await this.docker.listContainers({ all: true,
      filters: { label: [`com.docker.compose.project=${this.project}`] } });
    for (const c of list) {
      const info = await this.docker.getContainer(c.Id).inspect();
      const img: string = info.Config?.Image ?? '';
      if (img.startsWith(this.cfg.gameRepo + ':') || img.startsWith(this.cfg.dbRepo + ':')) {
        return img.slice(img.lastIndexOf(':') + 1);
      }
    }
    return null;
  }
}
