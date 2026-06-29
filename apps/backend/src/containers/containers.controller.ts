// apps/backend/src/containers/containers.controller.ts
import { Controller, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContainersService } from './containers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ContainersController {
  constructor(private readonly svc: ContainersService) {}
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
  async restart(@Param('name') name: string) { await this.svc.restart(name); return { queued: false, done: true }; }
  @Roles('admin', 'operator') @Post(':name/stop') @HttpCode(202)
  async stop(@Param('name') name: string) { await this.svc.stop(name); return { queued: false, done: true }; }
}
