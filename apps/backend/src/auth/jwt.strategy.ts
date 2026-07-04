// apps/backend/src/auth/jwt.strategy.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { AppException } from '../common/app-exception';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly bl: TokenBlacklistService,
    @Inject('JWT_CFG') cfg: { secret: string; accessTtl: number; refreshTtl: number },
    @InjectRepository(PanelUser) private readonly users: Repository<PanelUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.secret,
    });
  }

  async validate(payload: any) {
    if (await this.bl.isBlacklisted(payload.jti)) {
      throw new AppException('token_revoked', HttpStatus.UNAUTHORIZED, 'Token iptal edilmiş');
    }
    const u = await this.users.findOne({ where: { id: payload.sub } });
    if (!u || u.status === 'disabled') throw new AppException('no_access', HttpStatus.UNAUTHORIZED, 'Erişim yok');
    return { id: u.id, username: u.username, role: u.role, status: u.status, jti: payload.jti };
  }
}
