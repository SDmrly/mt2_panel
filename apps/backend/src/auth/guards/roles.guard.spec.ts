// apps/backend/src/auth/guards/roles.guard.spec.ts
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const ctx = (role: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  getHandler: () => ({}), getClass: () => ({}),
}) as any;

describe('RolesGuard', () => {
  it('rol gerektirmeyen route serbest', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(undefined);
    expect(new RolesGuard(r).canActivate(ctx('viewer'))).toBe(true);
  });
  it('admin gerekiyorsa viewer reddedilir', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(new RolesGuard(r).canActivate(ctx('viewer'))).toBe(false);
  });
  it('operator, operator+admin route\'a girer', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(['admin','operator']);
    expect(new RolesGuard(r).canActivate(ctx('operator'))).toBe(true);
  });
});
