// apps/backend/src/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Between, FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditEntry } from './types';

export interface AuditQuery {
  action?: string; userId?: string; username?: string; from?: Date; to?: Date; limit?: number; offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly repo: Repository<AuditLog>) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.save({
        action: entry.action, result: entry.result,
        userId: entry.userId ?? null, username: entry.username ?? null,
        target: entry.target ?? null, ip: entry.ip ?? null, detail: entry.detail ?? null,
      });
    } catch (e) {
      this.logger.warn(`audit record failed: ${String((e as Error)?.message ?? e)}`);
    }
  }

  async query(f: AuditQuery): Promise<{ rows: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (f.action) where.action = f.action as AuditLog['action'];
    if (f.userId) where.userId = f.userId;
    if (f.username) where.username = ILike(`%${f.username}%`);
    if (f.from && f.to) where.createdAt = Between(f.from, f.to);
    else if (f.from) where.createdAt = MoreThanOrEqual(f.from);
    else if (f.to) where.createdAt = LessThanOrEqual(f.to);
    const [rows, total] = await this.repo.findAndCount({
      where, order: { createdAt: 'DESC' }, take: f.limit ?? 50, skip: f.offset ?? 0,
    });
    return { rows, total };
  }
}
