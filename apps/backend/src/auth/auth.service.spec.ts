// apps/backend/src/auth/auth.service.spec.ts
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

const user = { id: 'u1', username: 'admin', role: 'admin', status: 'active', passwordHash: '' };
const repo = () => ({ findOne: jest.fn(), update: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) }) as any;
const jwt = () => ({ signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn() }) as any;
const bl = () => ({ saveRefresh: jest.fn(), blacklist: jest.fn(), isBlacklisted: jest.fn(), getRefresh: jest.fn(), revokeRefresh: jest.fn(), linkAccessToRefresh: jest.fn(), getLinkedRefresh: jest.fn().mockResolvedValue(null) }) as any;

describe('AuthService.login', () => {
  it('doğru şifrede token döner', async () => {
    const hash = new HashService(); user.passwordHash = await hash.hash('pw');
    const r = repo(); r.findOne.mockResolvedValue({ ...user });
    const svc = new AuthService(r, hash, jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    const res = await svc.login({ username: 'admin', password: 'pw' });
    expect(res.accessToken).toBe('tok');
    expect(res.user.username).toBe('admin');
  });
  it('yanlış şifrede UnauthorizedException', async () => {
    const hash = new HashService(); const r = repo();
    r.findOne.mockResolvedValue({ ...user, passwordHash: await hash.hash('other') });
    const svc = new AuthService(r, hash, jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.login({ username: 'admin', password: 'pw' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('kullanıcı yoksa UnauthorizedException', async () => {
    const r = repo(); r.findOne.mockResolvedValue(null);
    const svc = new AuthService(r, new HashService(), jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.login({ username: 'x', password: 'y' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.refresh', () => {
  const validPayload = { sub: 'u1', username: 'admin', role: 'admin', jti: 'r1', typ: 'refresh' };

  it('geçerli refresh token → accessToken döner ve signAsync çağrılır', async () => {
    const j = jwt(); j.verifyAsync.mockResolvedValue({ ...validPayload });
    const b = bl(); b.getRefresh.mockResolvedValue('u1');
    const r = repo(); r.findOne.mockResolvedValue({ id: 'u1', username: 'admin', role: 'admin', status: 'active' });
    const svc = new AuthService(r, new HashService(), j, b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    const res = await svc.refresh('sometoken');
    expect(res.accessToken).toBeDefined();
    expect(j.signAsync).toHaveBeenCalled();
  });

  it('typ "refresh" değilse UnauthorizedException', async () => {
    const j = jwt(); j.verifyAsync.mockResolvedValue({ sub: 'u1', username: 'admin', role: 'admin', jti: 'r1' });
    const b = bl(); b.getRefresh.mockResolvedValue('u1');
    const svc = new AuthService(repo(), new HashService(), j, b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.refresh('sometoken')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bl.getRefresh null döndürürse UnauthorizedException', async () => {
    const j = jwt(); j.verifyAsync.mockResolvedValue({ ...validPayload });
    const b = bl(); b.getRefresh.mockResolvedValue(null);
    const svc = new AuthService(repo(), new HashService(), j, b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.refresh('sometoken')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('kullanıcı disabled ise refresh → UnauthorizedException', async () => {
    const j = jwt(); j.verifyAsync.mockResolvedValue({ ...validPayload });
    const b = bl(); b.getRefresh.mockResolvedValue('u1');
    const r = repo(); r.findOne.mockResolvedValue({ id: 'u1', username: 'admin', role: 'admin', status: 'disabled' });
    const svc = new AuthService(r, new HashService(), j, b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.refresh('sometoken')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.logout', () => {
  it('blacklist çağrılır', async () => {
    const b = bl();
    const svc = new AuthService(repo(), new HashService(), jwt(), b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await svc.logout('jti-123');
    expect(b.blacklist).toHaveBeenCalledWith('jti-123', 900);
  });

  it('linked refresh jti varsa revokeRefresh çağrılır', async () => {
    const b = bl();
    b.getLinkedRefresh.mockResolvedValue('refresh-jti-abc');
    const svc = new AuthService(repo(), new HashService(), jwt(), b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await svc.logout('jti-123');
    expect(b.blacklist).toHaveBeenCalledWith('jti-123', 900);
    expect(b.getLinkedRefresh).toHaveBeenCalledWith('jti-123');
    expect(b.revokeRefresh).toHaveBeenCalledWith('refresh-jti-abc');
  });

  it('linked refresh jti yoksa revokeRefresh çağrılmaz', async () => {
    const b = bl();
    b.getLinkedRefresh.mockResolvedValue(null);
    const svc = new AuthService(repo(), new HashService(), jwt(), b, { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await svc.logout('jti-123');
    expect(b.blacklist).toHaveBeenCalledWith('jti-123', 900);
    expect(b.revokeRefresh).not.toHaveBeenCalled();
  });
});

describe('AuthService.register', () => {
  it('register: yeni pending+viewer kullanıcı oluşturur', async () => {
    const r = repo(); r.findOne.mockResolvedValue(null);
    const svc = new AuthService(r, new HashService(), jwt(), bl(), { secret:'s', accessTtl:900, refreshTtl:604800 } as any);
    await svc.register({ username: 'yeni', email: 'y@x.com', password: 'parola12' });
    expect(r.save).toHaveBeenCalledWith(expect.objectContaining({ username: 'yeni', email: 'y@x.com', status: 'pending', role: 'viewer' }));
  });
  it('register: kullanıcı/email varsa ConflictException', async () => {
    const r = repo(); r.findOne.mockResolvedValue({ id: 'u1' });
    const svc = new AuthService(r, new HashService(), jwt(), bl(), { secret:'s', accessTtl:900, refreshTtl:604800 } as any);
    await expect(svc.register({ username: 'a', email: 'a@x.com', password: 'parola12' })).rejects.toBeInstanceOf(ConflictException);
  });
  it('login: disabled kullanıcı UnauthorizedException', async () => {
    const r = repo(); const hash = new HashService();
    r.findOne.mockResolvedValue({ id:'u1', username:'a', role:'viewer', status:'disabled', passwordHash: await hash.hash('parola12') });
    const svc = new AuthService(r, hash, jwt(), bl(), { secret:'s', accessTtl:900, refreshTtl:604800 } as any);
    await expect(svc.login({ username:'a', password:'parola12' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
