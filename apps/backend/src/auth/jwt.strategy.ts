// apps/backend/src/auth/jwt.strategy.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly bl: TokenBlacklistService,
    @Inject('JWT_CFG') cfg: { secret: string; accessTtl: number; refreshTtl: number },
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.secret,
    });
  }

  async validate(payload: any) {
    if (await this.bl.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token iptal edilmiş');
    }
    return { id: payload.sub, username: payload.username, role: payload.role, jti: payload.jti };
  }
}
