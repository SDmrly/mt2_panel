// apps/backend/src/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get()
  list(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('username') username?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    // 'to' yalnız tarih (yyyy-mm-dd) ise o günün SONUNA çek ki o günün tüm kayıtları dahil olsun
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
    return this.audit.query({
      action, userId, username,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(dateOnly.test(to) ? `${to}T23:59:59.999Z` : to) : undefined,
      limit: Math.min(Number(limit) || 50, 200), offset: Number(offset) || 0,
    });
  }
}
