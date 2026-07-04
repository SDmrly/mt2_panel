// apps/backend/src/auth/guards/active.guard.ts
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/app-exception';
@Injectable()
export class ActiveGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || user.status !== 'active') throw new AppException('account_not_approved', HttpStatus.FORBIDDEN, 'Hesap onaylı değil');
    return true;
  }
}
