// apps/backend/src/auth/auth.service.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { AppException } from '../common/app-exception';
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

  async register(dto: { username: string; email: string; password: string }): Promise<void> {
    const existing = await this.users.findOne({ where: [{ username: dto.username }, { email: dto.email }] });
    if (existing) throw new AppException('username_or_email_taken', HttpStatus.CONFLICT, 'Kullanıcı adı veya e-posta zaten kayıtlı');
    await this.users.save(this.users.create({
      username: dto.username, email: dto.email,
      passwordHash: await this.hash.hash(dto.password),
      role: 'viewer', status: 'pending',
    }));
  }

  async login(dto: { username: string; password: string }) {
    const u = await this.users.findOne({ where: { username: dto.username } });
    if (!u || !(await this.hash.verify(dto.password, u.passwordHash))) {
      throw new AppException('invalid_credentials', HttpStatus.UNAUTHORIZED, 'Kullanıcı adı veya şifre hatalı');
    }
    if (u.status === 'disabled') throw new AppException('account_disabled', HttpStatus.UNAUTHORIZED, 'Hesap devre dışı');
    await this.users.update(u.id, { lastLogin: new Date() });
    return this.issueTokens(u);
  }

  private async issueTokens(u: PanelUser) {
    const accessJti = randomUUID(), refreshJti = randomUUID();
    const base = { sub: u.id, username: u.username, role: u.role, status: u.status };
    const accessToken = await this.jwt.signAsync({ ...base, jti: accessJti },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl });
    const refreshToken = await this.jwt.signAsync({ ...base, jti: refreshJti, typ: 'refresh' },
      { secret: this.cfg.secret, expiresIn: this.cfg.refreshTtl });
    await this.bl.saveRefresh(refreshJti, u.id, this.cfg.refreshTtl);
    await this.bl.linkAccessToRefresh(accessJti, refreshJti, this.cfg.refreshTtl);
    return { accessToken, refreshToken, user: { id: u.id, username: u.username, role: u.role, status: u.status } };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(refreshToken, { secret: this.cfg.secret }); }
    catch { throw new AppException('invalid_refresh', HttpStatus.UNAUTHORIZED, 'Geçersiz refresh token'); }
    if (!payload.jti) throw new AppException('invalid_refresh', HttpStatus.UNAUTHORIZED, 'Refresh token geçersiz');
    if (payload.typ !== 'refresh' || !(await this.bl.getRefresh(payload.jti)))
      throw new AppException('invalid_refresh', HttpStatus.UNAUTHORIZED, 'Refresh token geçersiz');
    const u = await this.users.findOne({ where: { id: payload.sub } });
    if (!u || u.status === 'disabled') throw new AppException('no_access', HttpStatus.UNAUTHORIZED, 'Erişim yok');
    const accessToken = await this.jwt.signAsync(
      { sub: u.id, username: u.username, role: u.role, status: u.status, jti: randomUUID() },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl },
    );
    return { accessToken };
  }

  async logout(jti: string) {
    await this.bl.blacklist(jti, this.cfg.accessTtl);
    const refreshJti = await this.bl.getLinkedRefresh(jti);
    if (refreshJti) await this.bl.revokeRefresh(refreshJti);
  }
}
