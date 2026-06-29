// apps/backend/src/logs/logs.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContainersModule } from '../containers/containers.module';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

@Module({
  imports: [AuthModule, ContainersModule],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
