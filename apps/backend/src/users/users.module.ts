// apps/backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { PanelUser } from '../database/entities/panel-user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([PanelUser])],
  controllers: [UsersController],
  providers: [
    { provide: UsersService, inject: [getRepositoryToken(PanelUser)], useFactory: (r: Repository<PanelUser>) => new UsersService(r) },
  ],
})
export class UsersModule {}
