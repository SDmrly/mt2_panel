// apps/backend/src/deploy/deploy.service.spec.ts
import { firstValueFrom, toArray } from 'rxjs';
import { DeployService } from './deploy.service';

const GAME_CARDS = [
  { name: 'metin2_auth', role: 'auth', image: { name: 'ghcr.io/changeme/metin2-game', tag: 'latest' } },
  { name: 'metin2_ch1', role: 'channel', image: { name: 'ghcr.io/changeme/metin2-game', tag: 'latest' } },
  { name: 'metin2_db', role: 'db-process', image: { name: 'ghcr.io/changeme/metin2-db', tag: 'latest' } },
  { name: 'metin2_database', role: 'database', image: { name: 'mariadb', tag: '10.4' } }, // game değil
];
const repo = () => ({ save: jest.fn(async (d) => ({ id: 'job1', ...d })), update: jest.fn() }) as any;
const containers = () => ({ discoverServices: jest.fn().mockResolvedValue(GAME_CARDS), getHealth: jest.fn().mockResolvedValue({ status: 'healthy' }) }) as any;
const tagService = () => ({ listTags: jest.fn().mockResolvedValue({ tags: [{ name: 'v1', deployable: true }], current: 'latest' }) }) as any;
const cfg = { gameRepo: 'ghcr.io/changeme/metin2-game', dbRepo: 'ghcr.io/changeme/metin2-db' } as any;

describe('DeployService', () => {
  it('başarılı deploy: sadece game container\'larını hedef tag\'e recreate eder, done', async () => {
    const calls: any[] = [];
    const recreator = { recreate: jest.fn(async (n, img) => { calls.push([n, img]); }) };
    const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg);
    const { jobId } = await svc.startDeploy('v1', 'u1');
    const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
    expect(calls).toEqual(expect.arrayContaining([
      ['metin2_auth', 'ghcr.io/changeme/metin2-game:v1'],
      ['metin2_ch1', 'ghcr.io/changeme/metin2-game:v1'],
      ['metin2_db', 'ghcr.io/changeme/metin2-db:v1'],
    ]));
    expect(calls.find((c) => c[0] === 'metin2_database')).toBeUndefined(); // mariadb dokunulmaz
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  it('recreate hatası: fromTag\'e geri recreate (rollback), failed', async () => {
    let n = 0;
    const recreator = { recreate: jest.fn(async () => { if (n++ === 1) throw new Error('boom'); }) };
    const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg);
    const { jobId } = await svc.startDeploy('v1', 'u1');
    const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
    expect(events.some((e) => e.type === 'rollback')).toBe(true);
    expect(events.some((e) => e.type === 'failed')).toBe(true);
  });

  it('geçersiz tag → reddedilir', async () => {
    const ts = { listTags: jest.fn().mockResolvedValue({ tags: [{ name: 'v1', deployable: false }], current: 'latest' }) } as any;
    const svc = new DeployService(repo(), containers(), { recreate: jest.fn() } as any, ts, cfg);
    await expect(svc.startDeploy('v1', 'u1')).rejects.toThrow();
  });

  it('aktif deploy varken ikinci istek ConflictException', async () => {
    const recreator = { recreate: jest.fn(() => new Promise<void>(() => {})) }; // asla bitmez
    const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg);
    await svc.startDeploy('v1', 'u1');
    await expect(svc.startDeploy('v1', 'u1')).rejects.toThrow();
  });
});
