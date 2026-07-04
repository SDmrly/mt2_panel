// apps/backend/src/users/users.service.spec.ts
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
  it('update: admin kendini disable edemez → cannot_modify_self', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]));
    await expect(svc.update('adm', 'adm', { status: 'disabled' })).rejects.toMatchObject({ response: { code: 'cannot_modify_self' }, status: 400 });
  });
  it('update: başkası son aktif adminin rolünü düşüremez → cannot_modify_last_admin', async () => {
    const r = repo([mkUser({ id: 'adm', role: 'admin', status: 'active' }), mkUser({ id: 'other', role: 'operator', status: 'active' })]);
    const svc = new UsersService(r);
    await expect(svc.update('adm', 'other', { role: 'viewer' })).rejects.toMatchObject({ response: { code: 'cannot_modify_last_admin' }, status: 400 });
  });
  it('remove: son aktif admin silinemez → cannot_delete_last_admin', async () => {
    const r = repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]);
    const svc = new UsersService(r);
    await expect(svc.remove('adm', 'other')).rejects.toMatchObject({ response: { code: 'cannot_delete_last_admin' }, status: 400 });
  });
  it('update: olmayan kullanıcı → user_not_found', async () => {
    const svc = new UsersService(repo([]));
    await expect(svc.update('x', 'adm', { role: 'viewer' })).rejects.toMatchObject({ response: { code: 'user_not_found' }, status: 404 });
  });
  it('update: admin kendini demote edemez → cannot_modify_self', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'adm', role: 'admin', status: 'active' })]));
    await expect(svc.update('adm', 'adm', { role: 'viewer' })).rejects.toMatchObject({ response: { code: 'cannot_modify_self' }, status: 400 });
  });
  it('remove: olmayan kullanıcı → user_not_found', async () => {
    const svc = new UsersService(repo([]));
    await expect(svc.remove('x', 'adm')).rejects.toMatchObject({ response: { code: 'user_not_found' }, status: 404 });
  });
  it('remove: kendini silemez → cannot_delete_self', async () => {
    const svc = new UsersService(repo([mkUser({ id: 'u1', role: 'viewer', status: 'active' })]));
    await expect(svc.remove('u1', 'u1')).rejects.toMatchObject({ response: { code: 'cannot_delete_self' }, status: 400 });
  });
});
