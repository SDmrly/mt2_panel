// apps/backend/src/auth/guards/active.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class ActiveGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || user.status !== 'active') throw new ForbiddenException('Hesap onaylı değil');
    return true;
  }
}
