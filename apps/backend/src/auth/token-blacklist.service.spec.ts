import RedisMock from 'ioredis-mock';
import { TokenBlacklistService } from './token-blacklist.service';
describe('TokenBlacklistService', () => {
  it('blacklist edilen jti isBlacklisted=true döner', async () => {
    const svc = new TokenBlacklistService(new RedisMock() as any);
    await svc.blacklist('jti-1', 60);
    expect(await svc.isBlacklisted('jti-1')).toBe(true);
    expect(await svc.isBlacklisted('jti-2')).toBe(false);
  });
});
