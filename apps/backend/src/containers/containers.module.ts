// apps/backend/src/containers/containers.module.ts
import { Module } from '@nestjs/common';
import Docker from 'dockerode';
import { AuthModule } from '../auth/auth.module';
import { ContainersController } from './containers.controller';
import { ContainersService } from './containers.service';
import { DOCKER, dockerProvider } from './docker.provider';
import { loadConfig } from '../config/config';

@Module({
  imports: [AuthModule],
  controllers: [ContainersController],
  providers: [dockerProvider, {
    provide: ContainersService,
    inject: [DOCKER],
    useFactory: (docker: Docker) => new ContainersService(docker, loadConfig().mt2Project),
  }],
})
export class ContainersModule {}
