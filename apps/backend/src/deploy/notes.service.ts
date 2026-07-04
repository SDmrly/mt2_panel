// apps/backend/src/deploy/notes.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ReleaseNote } from './release-note.entity';

@Injectable()
export class NotesService {
  constructor(private readonly repo: Repository<ReleaseNote>) {}

  async upsert(kind: string, tag: string, note: string, userId: string | null): Promise<void> {
    // Atomic INSERT ... ON CONFLICT DO UPDATE to avoid a TOCTOU race between
    // concurrent calls for the same (kind, tag) hitting the UNIQUE constraint.
    // updatedAt is set explicitly because @UpdateDateColumn's DEFAULT now()
    // only fires on INSERT, not on the ON CONFLICT UPDATE path.
    await this.repo.upsert(
      { kind, tag, note, updatedBy: userId, updatedAt: new Date() },
      ['kind', 'tag'],
    );
  }

  async getMap(kind: string): Promise<Map<string, string>> {
    const rows = await this.repo.find({ where: { kind } });
    return new Map(rows.map((r) => [r.tag, r.note]));
  }
}
