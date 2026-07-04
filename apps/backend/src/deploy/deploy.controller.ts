// apps/backend/src/deploy/deploy.controller.ts
import { Body, Controller, Delete, Get, HttpStatus, MessageEvent, Param, Post, Put, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveGuard } from '../auth/guards/active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppException } from '../common/app-exception';
import { TagService } from './tag.service';
import { DeployService } from './deploy.service';
import { Deployment } from './deployment.entity';
import { DeployKind } from './types';
import { AuditService } from '../audit/audit.service';

function assertKind(kind: unknown): asserts kind is DeployKind {
  if (kind !== 'game' && kind !== 'db') throw new AppException('invalid_kind', HttpStatus.BAD_REQUEST, 'kind "game" veya "db" olmalı');
}

@UseGuards(JwtAuthGuard, ActiveGuard, RolesGuard)
@Roles('admin')
@Controller()
export class DeployController {
  constructor(
    private readonly tags: TagService,
    private readonly deploy: DeployService,
    @InjectRepository(Deployment) private readonly repo: Repository<Deployment>,
    private readonly audit: AuditService,
  ) {}

  @Get('deploy/tags') listTags() { return this.tags.listTags(); }
  @Post('deploy') async start(@Body('kind') kind: unknown, @Body('tag') tag: string, @Req() req: any) {
    assertKind(kind);
    const target = `${kind}:${tag}`;
    try {
      const res = await this.deploy.startDeploy(kind, tag, req.user.id);
      await this.audit.record({ action: 'deploy', result: 'success', userId: req.user.id, username: req.user.username, target, ip: req.ip, detail: { jobId: res.jobId } });
      return res;
    } catch (e: any) {
      await this.audit.record({ action: 'deploy', result: 'failure', userId: req.user.id, username: req.user.username, target, ip: req.ip, detail: { error: String(e?.message ?? e) } });
      throw e;
    }
  }
  @Sse('deploy/jobs/:id/stream') stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.deploy.streamJob(id).pipe(map((data) => ({ data }) as MessageEvent));
  }
  @Get('deployments') history(@Query('limit') limit = '50') {
    return this.repo.find({ order: { startedAt: 'DESC' }, take: Number(limit) || 50 });
  }
  @Delete('deploy/images/:kind/:tag') deleteImage(@Param('kind') kind: unknown, @Param('tag') tag: string, @Req() req: any) {
    assertKind(kind);
    return this.deploy.deleteImage(kind, tag, req.user);
  }
  @Put('deploy/images/:kind/:tag/note')
  updateNote(@Param('kind') kind: unknown, @Param('tag') tag: string, @Body('note') note: string, @Req() req: any) {
    assertKind(kind);
    return this.deploy.updateNote(kind, tag, note ?? '', req.user);
  }
}
