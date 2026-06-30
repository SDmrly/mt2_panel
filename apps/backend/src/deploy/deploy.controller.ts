// apps/backend/src/deploy/deploy.controller.ts
import { Body, Controller, Get, MessageEvent, Param, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TagService } from './tag.service';
import { DeployService } from './deploy.service';
import { Deployment } from './deployment.entity';
import { AuditService } from '../audit/audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Post('deploy') async start(@Body('tag') tag: string, @Req() req: any) {
    try {
      const res = await this.deploy.startDeploy(tag, req.user.id);
      await this.audit.record({ action: 'deploy', result: 'success', userId: req.user.id, username: req.user.username, target: tag, ip: req.ip, detail: { jobId: res.jobId } });
      return res;
    } catch (e: any) {
      await this.audit.record({ action: 'deploy', result: 'failure', userId: req.user.id, username: req.user.username, target: tag, ip: req.ip, detail: { error: String(e?.message ?? e) } });
      throw e;
    }
  }
  @Sse('deploy/jobs/:id/stream') stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.deploy.streamJob(id).pipe(map((data) => ({ data }) as MessageEvent));
  }
  @Get('deployments') history(@Query('limit') limit = '50') {
    return this.repo.find({ order: { startedAt: 'DESC' }, take: Number(limit) || 50 });
  }
}
