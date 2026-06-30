// apps/backend/src/containers/containers.controller.ts
import { Controller, Get, HttpCode, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContainersService } from './containers.service';
import { AuditService } from '../audit/audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ContainersController {
  constructor(private readonly svc: ContainersService, private readonly audit: AuditService) {}
  @Get() list() { return this.svc.discoverServices(); }
  @Get(':name') async one(@Param('name') name: string) {
    const all = await this.svc.discoverServices();
    const card = all.find((c) => c.name === name);
    if (!card) throw new NotFoundException();
    return card;
  }
  @Get(':name/stats') stats(@Param('name') name: string) { return this.svc.getStats(name); }
  @Get(':name/healthcheck') health(@Param('name') name: string) { return this.svc.getHealth(name); }
  @Roles('admin', 'operator') @Post(':name/restart') @HttpCode(202)
  async restart(@Param('name') name: string, @Req() req: any) {
    try {
      await this.svc.restart(name);
      await this.audit.record({ action: 'service_restart', result: 'success', userId: req.user.id, username: req.user.username, target: name, ip: req.ip });
      return { queued: false, done: true };
    } catch (e: any) {
      await this.audit.record({ action: 'service_restart', result: 'failure', userId: req.user.id, username: req.user.username, target: name, ip: req.ip, detail: { error: String(e?.message ?? e) } });
      throw e;
    }
  }
  @Roles('admin', 'operator') @Post(':name/stop') @HttpCode(202)
  async stop(@Param('name') name: string, @Req() req: any) {
    try {
      await this.svc.stop(name);
      await this.audit.record({ action: 'service_stop', result: 'success', userId: req.user.id, username: req.user.username, target: name, ip: req.ip });
      return { queued: false, done: true };
    } catch (e: any) {
      await this.audit.record({ action: 'service_stop', result: 'failure', userId: req.user.id, username: req.user.username, target: name, ip: req.ip, detail: { error: String(e?.message ?? e) } });
      throw e;
    }
  }
}
