// apps/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { loadConfig } from '../config/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PanelUser]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    HashService,
    TokenBlacklistService,
    JwtStrategy,
    AuthService,
    { provide: 'JWT_CFG', useValue: loadConfig().jwt },
  ],
  exports: [TokenBlacklistService],
})
export class AuthModule {}
