// apps/backend/src/system/system.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveGuard } from '../auth/guards/active.guard';
import { SystemService } from './system.service';
@UseGuards(JwtAuthGuard, ActiveGuard)
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}
  @Get('overview') overview() { return this.system.overview(); }
}
