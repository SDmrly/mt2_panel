// apps/backend/src/audit/audit.service.spec.ts
import { AuditService } from './audit.service';

function fakeRepo() {
  return {
    save: jest.fn().mockResolvedValue({}),
    findAndCount: jest.fn().mockResolvedValue([[{ id: 'a1' }], 1]),
  } as any;
}

describe('AuditService', () => {
  it('record: repo.save çağırır', async () => {
    const repo = fakeRepo();
    await new AuditService(repo).record({ action: 'login', result: 'success', userId: 'u1', username: 'admin' });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'login', result: 'success', username: 'admin' }));
  });
  it('record: repo hata atarsa YUTAR (throw etmez)', async () => {
    const repo = fakeRepo(); repo.save.mockRejectedValue(new Error('db down'));
    await expect(new AuditService(repo).record({ action: 'logout', result: 'success' })).resolves.toBeUndefined();
  });
  it('query: findAndCount sonucu {rows,total} döner, createdAt DESC', async () => {
    const repo = fakeRepo();
    const res = await new AuditService(repo).query({ limit: 10, offset: 0 });
    expect(res).toEqual({ rows: [{ id: 'a1' }], total: 1 });
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ order: { createdAt: 'DESC' }, take: 10, skip: 0 }));
  });
  it('query: action ve userId filtresi where\'e girer', async () => {
    const repo = fakeRepo();
    await new AuditService(repo).query({ action: 'deploy', userId: 'u1', limit: 50, offset: 0 });
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ action: 'deploy', userId: 'u1' }) }));
  });
  it('query: username filtresi ILike ile where\'e girer', async () => {
    const repo = fakeRepo();
    await new AuditService(repo).query({ username: 'adm', limit: 50, offset: 0 });
    const call = repo.findAndCount.mock.calls[0][0];
    expect(call.where.username).toBeDefined();
    // ILike returns a FindOperator object (not a plain string)
    expect(typeof call.where.username).toBe('object');
  });
});
