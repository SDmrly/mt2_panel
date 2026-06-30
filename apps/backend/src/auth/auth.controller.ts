// apps/backend/src/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    try {
      const res = await this.auth.login(dto);
      await this.audit.record({ action: 'login', result: 'success', userId: res.user.id, username: res.user.username, ip: req.ip });
      return res;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        await this.audit.record({ action: 'login_failed', result: 'failure', username: dto.username, ip: req.ip, detail: { reason: 'bad credentials' } });
      }
      throw e;
    }
  }

  @Post('refresh')
  refresh(@Body('refreshToken') rt: string) { return this.auth.refresh(rt); }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: any) {
    await this.auth.logout(req.user.jti);
    await this.audit.record({ action: 'logout', result: 'success', userId: req.user.id, username: req.user.username, ip: req.ip });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { id: req.user.id, username: req.user.username, role: req.user.role };
  }
}
