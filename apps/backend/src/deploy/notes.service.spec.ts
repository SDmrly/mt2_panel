// apps/backend/src/deploy/notes.service.spec.ts
import { NotesService } from './notes.service';

function repoMock() {
  const store: any[] = [];
  return {
    _store: store,
    upsert: jest.fn((entity: any, conflictPaths: string[]) => {
      const i = store.findIndex((x) => x.kind === entity.kind && x.tag === entity.tag);
      if (i >= 0) store[i] = { ...store[i], ...entity };
      else store.push({ ...entity });
      return { generatedMaps: [], raw: [], identifiers: [] };
    }),
    find: jest.fn(({ where }) => store.filter((r) => r.kind === where.kind)),
  } as any;
}

describe('NotesService', () => {
  it('upsert yeni ekler sonra günceller', async () => {
    const repo = repoMock(); const svc = new NotesService(repo);
    await svc.upsert('game', 'v1', 'ilk', 'u1');
    await svc.upsert('game', 'v1', 'ikinci', 'u2');
    expect(repo._store).toHaveLength(1);
    expect(repo._store[0].note).toBe('ikinci');
    expect(repo._store[0].updatedBy).toBe('u2');
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'game', tag: 'v1', note: 'ikinci', updatedBy: 'u2' }),
      ['kind', 'tag'],
    );
  });

  it('getMap kind için tag→note döner', async () => {
    const repo = repoMock(); const svc = new NotesService(repo);
    await svc.upsert('db', 'v2', 'db notu', 'u1');
    const m = await svc.getMap('db');
    expect(m.get('v2')).toBe('db notu');
  });
});
