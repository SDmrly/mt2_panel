// apps/backend/src/deploy/deploy.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import Docker from 'dockerode';
import { Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { ContainersModule } from '../containers/containers.module';
import { ContainersService } from '../containers/containers.service';
import { DOCKER, dockerProvider } from '../containers/docker.provider';
import { AuditService } from '../audit/audit.service';
import { Deployment } from './deployment.entity';
import { ReleaseNote } from './release-note.entity';
import { TagService } from './tag.service';
import { NotesService } from './notes.service';
import { DeployService } from './deploy.service';
import { DeployController } from './deploy.controller';
import { RECREATOR, DockerRecreator } from './recreator';
import { loadConfig } from '../config/config';

@Module({
  imports: [AuthModule, ContainersModule, TypeOrmModule.forFeature([Deployment, ReleaseNote])],
  controllers: [DeployController],
  providers: [
    dockerProvider,
    { provide: RECREATOR, inject: [DOCKER, ContainersService], useFactory: (d: Docker, c: ContainersService) => new DockerRecreator(d, c) },
    {
      provide: NotesService,
      inject: [getRepositoryToken(ReleaseNote)],
      useFactory: (repo: Repository<ReleaseNote>) => new NotesService(repo),
    },
    {
      provide: TagService,
      inject: [DOCKER, NotesService],
      useFactory: (d: Docker, n: NotesService) => new TagService(d, loadConfig().deploy, loadConfig().mt2Project, n),
    },
    {
      provide: DeployService,
      inject: [getRepositoryToken(Deployment), ContainersService, RECREATOR, TagService, DOCKER, AuditService, NotesService],
      useFactory: (repo: Repository<Deployment>, c: ContainersService, r: any, t: TagService, d: Docker, a: AuditService, n: NotesService) =>
        new DeployService(repo, c, r, t, loadConfig().deploy, d, a, n),
    },
  ],
})
export class DeployModule {}
