// apps/backend/src/auth/hash.service.spec.ts
import { HashService } from './hash.service';
describe('HashService', () => {
  const svc = new HashService();
  it('hash + verify doğru şifreyi kabul eder', async () => {
    const h = await svc.hash('Secret123!');
    expect(h).not.toEqual('Secret123!');
    expect(await svc.verify('Secret123!', h)).toBe(true);
  });
  it('yanlış şifreyi reddeder', async () => {
    const h = await svc.hash('Secret123!');
    expect(await svc.verify('wrong', h)).toBe(false);
  });
});
