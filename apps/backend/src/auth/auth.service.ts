// apps/backend/src/auth/auth.service.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { HashService } from './hash.service';
import { TokenBlacklistService } from './token-blacklist.service';

interface JwtCfg { secret: string; accessTtl: number; refreshTtl: number; }

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PanelUser) private readonly users: Repository<PanelUser>,
    private readonly hash: HashService,
    private readonly jwt: JwtService,
    private readonly bl: TokenBlacklistService,
    @Inject('JWT_CFG') private readonly cfg: JwtCfg,
  ) {}

  async login(dto: { username: string; password: string }) {
    const u = await this.users.findOne({ where: { username: dto.username } });
    if (!u || !(await this.hash.verify(dto.password, u.passwordHash))) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
    }
    await this.users.update(u.id, { lastLogin: new Date() });
    return this.issueTokens(u);
  }

  private async issueTokens(u: PanelUser) {
    const accessJti = randomUUID(), refreshJti = randomUUID();
    const base = { sub: u.id, username: u.username, role: u.role };
    const accessToken = await this.jwt.signAsync({ ...base, jti: accessJti },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl });
    const refreshToken = await this.jwt.signAsync({ ...base, jti: refreshJti, typ: 'refresh' },
      { secret: this.cfg.secret, expiresIn: this.cfg.refreshTtl });
    await this.bl.saveRefresh(refreshJti, u.id, this.cfg.refreshTtl);
    await this.bl.linkAccessToRefresh(accessJti, refreshJti, this.cfg.refreshTtl);
    return { accessToken, refreshToken, user: { id: u.id, username: u.username, role: u.role } };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(refreshToken, { secret: this.cfg.secret }); }
    catch { throw new UnauthorizedException('Geçersiz refresh token'); }
    if (!payload.jti) throw new UnauthorizedException('Refresh token geçersiz');
    if (payload.typ !== 'refresh' || !(await this.bl.getRefresh(payload.jti)))
      throw new UnauthorizedException('Refresh token geçersiz');
    const accessToken = await this.jwt.signAsync(
      { sub: payload.sub, username: payload.username, role: payload.role, jti: randomUUID() },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl });
    return { accessToken };
  }

  async logout(jti: string) {
    await this.bl.blacklist(jti, this.cfg.accessTtl);
    const refreshJti = await this.bl.getLinkedRefresh(jti);
    if (refreshJti) await this.bl.revokeRefresh(refreshJti);
  }
}
