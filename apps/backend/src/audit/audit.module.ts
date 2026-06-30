// apps/backend/src/audit/audit.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    {
      provide: AuditService,
      inject: [getRepositoryToken(AuditLog)],
      useFactory: (repo: Repository<AuditLog>) => new AuditService(repo),
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
