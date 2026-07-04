// apps/backend/src/deploy/tag.service.spec.ts
import { TagService } from './tag.service';

function fakeDocker() {
  return {
    listImages: jest.fn().mockResolvedValue([
      { RepoTags: ['ghcr.io/changeme/metin2-game:latest', 'ghcr.io/changeme/metin2-game:v1'], Created: 1700000000, Size: 314572800 },
      { RepoTags: ['ghcr.io/changeme/metin2-db:latest', 'ghcr.io/changeme/metin2-db:v1'], Created: 1700000100, Size: 104857600 },
      { RepoTags: ['mariadb:10.4'], Created: 1700000200, Size: 209715200 },
    ]),
    listContainers: jest.fn().mockResolvedValue([
      { Id: 'game1', Image: 'sha256:deadbeef', Labels: { 'com.docker.compose.project': 'metin2-svfiles', 'com.docker.compose.service': 'metin2_ch1' } },
      { Id: 'db1', Image: 'sha256:beadfeed', Labels: { 'com.docker.compose.project': 'metin2-svfiles', 'com.docker.compose.service': 'metin2_db' } },
    ]),
    getContainer: jest.fn().mockImplementation((id: string) => ({
      inspect: jest.fn().mockResolvedValue({
        Config: { Image: id === 'game1' ? 'ghcr.io/changeme/metin2-game:latest' : 'ghcr.io/changeme/metin2-db:v1' },
      }),
    })),
  } as any;
}
const cfg = { gameRepo: 'ghcr.io/changeme/metin2-game', dbRepo: 'ghcr.io/changeme/metin2-db' } as any;

function fakeNotes(game: Map<string, string> = new Map(), db: Map<string, string> = new Map()) {
  return {
    getMap: jest.fn((kind: string) => Promise.resolve(kind === 'db' ? db : game)),
  } as any;
}

describe('TagService.listTags', () => {
  it('game ve db için ayrı listeler + currentGame/currentDb döndürür', async () => {
    const svc = new TagService(fakeDocker(), cfg, 'metin2-svfiles', fakeNotes());
    const res = await svc.listTags();
    expect(Array.isArray(res.game)).toBe(true);
    expect(Array.isArray(res.db)).toBe(true);
    expect(res.currentGame).toBe('latest');
    expect(res.currentDb).toBe('v1');
    expect(res.game.map((t) => t.name).sort()).toEqual(['latest', 'v1']);
    expect(res.db.map((t) => t.name).sort()).toEqual(['latest', 'v1']);
  });

  it('her game tag için createdAt (ISO) + sizeMb + isRunning + deployable döndürür', async () => {
    const svc = new TagService(fakeDocker(), cfg, 'metin2-svfiles', fakeNotes());
    const res = await svc.listTags();
    const latest = res.game.find((t) => t.name === 'latest')!;
    const v1 = res.game.find((t) => t.name === 'v1')!;
    expect(latest.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(latest.sizeMb).toBeGreaterThan(0);
    expect(latest.isRunning).toBe(true);
    expect(latest.deployable).toBe(false); // çalışan tag deploy edilemez
    expect(v1.isRunning).toBe(false);
    expect(v1.deployable).toBe(true);
    expect((latest as any).hasDbPair).toBeUndefined(); // hasDbPair kaldırıldı
  });

  it('db listesi kendi tag\'lerini ve isRunning/deployable durumunu bağımsız taşır', async () => {
    const svc = new TagService(fakeDocker(), cfg, 'metin2-svfiles', fakeNotes());
    const res = await svc.listTags();
    const dbLatest = res.db.find((t) => t.name === 'latest')!;
    const dbV1 = res.db.find((t) => t.name === 'v1')!;
    expect(dbLatest.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dbLatest.isRunning).toBe(false);
    expect(dbLatest.deployable).toBe(true);
    expect(dbV1.isRunning).toBe(true);
    expect(dbV1.deployable).toBe(false);
  });

  it('aynı repo için EXITED ve RUNNING container varsa RUNNING olanın tag\'i tercih edilir', async () => {
    const docker = {
      listImages: jest.fn().mockResolvedValue([
        { RepoTags: ['ghcr.io/changeme/metin2-game:old', 'ghcr.io/changeme/metin2-game:new'], Created: 1700000000, Size: 104857600 },
      ]),
      listContainers: jest.fn().mockResolvedValue([
        { Id: 'old1', State: 'exited', Status: 'Exited (0) 2 hours ago', Labels: { 'com.docker.compose.project': 'metin2-svfiles' } },
        { Id: 'new1', State: 'running', Status: 'Up 3 hours', Labels: { 'com.docker.compose.project': 'metin2-svfiles' } },
      ]),
      getContainer: jest.fn().mockImplementation((id: string) => ({
        inspect: jest.fn().mockResolvedValue({
          Config: { Image: id === 'old1' ? 'ghcr.io/changeme/metin2-game:old' : 'ghcr.io/changeme/metin2-game:new' },
        }),
      })),
    } as any;
    const svc = new TagService(docker, cfg, 'metin2-svfiles', fakeNotes());
    const res = await svc.listTags();
    expect(res.currentGame).toBe('new');
  });

  it('çalışan container yoksa current* null olur, tüm tag\'ler deployable', async () => {
    const docker = fakeDocker();
    docker.listContainers = jest.fn().mockResolvedValue([]);
    const svc = new TagService(docker, cfg, 'metin2-svfiles', fakeNotes());
    const res = await svc.listTags();
    expect(res.currentGame).toBeNull();
    expect(res.currentDb).toBeNull();
    expect(res.game.every((t) => t.deployable)).toBe(true);
    expect(res.db.every((t) => t.deployable)).toBe(true);
  });

  it('bir tag için not varsa TagInfo.note doldurulur, yoksa null olur', async () => {
    const notes = fakeNotes(new Map([['v1', 'game notu']]), new Map([['latest', 'db notu']]));
    const svc = new TagService(fakeDocker(), cfg, 'metin2-svfiles', notes);
    const res = await svc.listTags();
    expect(res.game.find((t) => t.name === 'v1')!.note).toBe('game notu');
    expect(res.game.find((t) => t.name === 'latest')!.note).toBeNull();
    expect(res.db.find((t) => t.name === 'latest')!.note).toBe('db notu');
    expect(res.db.find((t) => t.name === 'v1')!.note).toBeNull();
  });
});
