// apps/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { PanelUser } from './database/entities/panel-user.entity';
import { Deployment } from './deploy/deployment.entity';
import { AuditLog } from './audit/audit-log.entity';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ContainersModule } from './containers/containers.module';
import { LogsModule } from './logs/logs.module';
import { DeployModule } from './deploy/deploy.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT ?? 5432),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        entities: [PanelUser, Deployment, AuditLog],
        synchronize: false,
      }),
    }),
    RedisModule,
    AuthModule,
    AuditModule,
    UsersModule,
    ContainersModule,
    LogsModule,
    DeployModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
