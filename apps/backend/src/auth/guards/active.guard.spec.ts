// apps/backend/src/auth/guards/active.guard.spec.ts
import { ActiveGuard } from './active.guard';
const ctx = (status: string) => ({ switchToHttp: () => ({ getRequest: () => ({ user: { status } }) }) }) as any;
describe('ActiveGuard', () => {
  it('active → true', () => { expect(new ActiveGuard().canActivate(ctx('active'))).toBe(true); });
  it('pending → account_not_approved (403)', () => {
    try {
      new ActiveGuard().canActivate(ctx('pending'));
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.status).toBe(403);
      expect(e.response).toMatchObject({ code: 'account_not_approved' });
    }
  });
  it('disabled → account_not_approved (403)', () => {
    try {
      new ActiveGuard().canActivate(ctx('disabled'));
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.status).toBe(403);
      expect(e.response).toMatchObject({ code: 'account_not_approved' });
    }
  });
});
