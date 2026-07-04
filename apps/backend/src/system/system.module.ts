// apps/backend/src/system/system.module.ts
import { Module } from '@nestjs/common';
import Docker from 'dockerode';
import { AuthModule } from '../auth/auth.module';
import { ContainersModule } from '../containers/containers.module';
import { ContainersService } from '../containers/containers.service';
import { DOCKER, dockerProvider } from '../containers/docker.provider';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
@Module({
  imports: [AuthModule, ContainersModule],
  controllers: [SystemController],
  providers: [dockerProvider, { provide: SystemService, inject: [DOCKER, ContainersService], useFactory: (d: Docker, c: ContainersService) => new SystemService(d, c) }],
})
export class SystemModule {}
