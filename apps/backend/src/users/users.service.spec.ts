// apps/backend/src/users/users.service.spec.ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const mkUser = (o: any) => ({ id: o.id, username: o.username, email: o.email ?? null, status: o.status ?? 'active', role: o.role ?? 'viewer', passwordHash: 'x', createdAt: new Date(), lastLogin: null });
function repo(users: any[]) {
  return {
    find: jest.fn().mockResolvedValue(users),
    findOne: jest.fn().mockImplementation(async ({ where: { id } }: any) => users.find((u) => u.id === id) ?? null),
    count: jest.fn().mockImplementation(async ({ where }: any) => users.filter((u) => u.status === where.status && u.role === where.role).length),
    save: jest.fn().mockImplementation(async (u: any) => u),
    delete: jest.fn().mockResolvedValue({}),
  } as any;
}

describe('UsersService', () => {
  it('list: passwordHash içermez', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'u1', username: 'a' })]));
    const rows = await svc.list();
    expect(rows[0]).not.toHaveProperty('passwordHash');
    expect(rows[0]).toMatchObject({ id: 'u1', username: 'a' });
  });
  it('update: pending → active + role', async () => {
    const r = repo([mkUser({ id: 'u1', username: 'a', status: 'pending', role: 'viewer' }), mkUser({ id: 'adm', role: 'admin' })]);
    const svc = new UsersService(r);
    const res = await svc.update('u1', 'adm', { status: 'active', role: 'operator' });
    expect(res.status).toBe('active'); expect(res.role).toBe('operator');
  });
  it('update: admin kendini disable edemez → BadRequest', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]));
    await expect(svc.update('adm', 'adm', { status: 'disabled' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('remove: son aktif admin silinemez → BadRequest', async () => {
    const r = repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]);
    const svc = new UsersService(r);
    await expect(svc.remove('adm', 'other')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('update: olmayan kullanıcı → NotFound', async () => {
    const svc = new UsersService(repo([]));
    await expect(svc.update('x', 'adm', { role: 'viewer' })).rejects.toBeInstanceOf(NotFoundException);
  });
  it('update: admin kendini demote edemez → BadRequest', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]));
    await expect(svc.update('adm', 'adm', { role: 'viewer' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('remove: olmayan kullanıcı → NotFound', async () => {
    const svc = new UsersService(repo([]));
    await expect(svc.remove('x', 'adm')).rejects.toBeInstanceOf(NotFoundException);
  });
});
