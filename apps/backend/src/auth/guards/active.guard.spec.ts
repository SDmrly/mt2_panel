// apps/backend/src/auth/guards/active.guard.spec.ts
import { ForbiddenException } from '@nestjs/common';
import { ActiveGuard } from './active.guard';
const ctx = (status: string) => ({ switchToHttp: () => ({ getRequest: () => ({ user: { status } }) }) }) as any;
describe('ActiveGuard', () => {
  it('active → true', () => { expect(new ActiveGuard().canActivate(ctx('active'))).toBe(true); });
  it('pending → ForbiddenException', () => { expect(() => new ActiveGuard().canActivate(ctx('pending'))).toThrow(ForbiddenException); });
  it('disabled → ForbiddenException', () => { expect(() => new ActiveGuard().canActivate(ctx('disabled'))).toThrow(ForbiddenException); });
});
