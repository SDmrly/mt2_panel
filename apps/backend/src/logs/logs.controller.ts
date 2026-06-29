// apps/backend/src/logs/logs.controller.ts
import { Controller, Get, MessageEvent, Param, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Sse(':name/stream')
  stream(@Param('name') name: string): Observable<MessageEvent> {
    return this.logs.streamLogs(name).pipe(map((data) => ({ data }) as MessageEvent));
  }

  @Get(':name')
  tail(@Param('name') name: string, @Query('tail') tail = '200') {
    return this.logs.tailLogs(name, Number(tail) || 200);
  }
}
