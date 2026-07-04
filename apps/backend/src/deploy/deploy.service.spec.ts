// apps/backend/src/deploy/deploy.service.spec.ts
import { firstValueFrom, toArray } from 'rxjs';
import { DeployService } from './deploy.service';

const GAME_CARDS = [
  { name: 'metin2_auth', role: 'auth', image: { name: 'ghcr.io/changeme/metin2-game', tag: 'latest' } },
  { name: 'metin2_ch1', role: 'channel', image: { name: 'ghcr.io/changeme/metin2-game', tag: 'latest' } },
  { name: 'metin2_db', role: 'db-process', image: { name: 'ghcr.io/changeme/metin2-db', tag: 'latest' } },
  { name: 'metin2_database', role: 'database', image: { name: 'mariadb', tag: '10.4' } }, // game/db repo değil
];
const repo = () => ({ save: jest.fn(async (d) => ({ id: 'job1', ...d })), update: jest.fn() }) as any;
const containers = () => ({ discoverServices: jest.fn().mockResolvedValue(GAME_CARDS), getHealth: jest.fn().mockResolvedValue({ status: 'healthy' }) }) as any;
const tagService = () => ({
  listTags: jest.fn().mockResolvedValue({
    game: [{ name: 'v1', deployable: true }],
    db: [{ name: 'v1', deployable: true }],
    currentGame: 'latest',
    currentDb: 'latest',
  }),
}) as any;
const cfg = { gameRepo: 'ghcr.io/changeme/metin2-game', dbRepo: 'ghcr.io/changeme/metin2-db' } as any;
const dockerStub = () => ({}) as any;
const auditStub = () => ({ record: jest.fn().mockResolvedValue(undefined) }) as any;
const notesStub = () => ({ upsert: jest.fn().mockResolvedValue(undefined), getMap: jest.fn().mockResolvedValue(new Map()) }) as any;

describe('DeployService', () => {
  describe('startDeploy per-kind', () => {
    it('startDeploy(game): sadece game repo konteynerlerini recreate eder, dbRepo dokunulmaz, done', async () => {
      const calls: any[] = [];
      const recreator = { recreate: jest.fn(async (n, img) => { calls.push([n, img]); }) };
      const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      const { jobId } = await svc.startDeploy('game', 'v1', 'u1');
      expect(jobId).toBeDefined();
      const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
      expect(calls).toEqual(expect.arrayContaining([
        ['metin2_auth', 'ghcr.io/changeme/metin2-game:v1'],
        ['metin2_ch1', 'ghcr.io/changeme/metin2-game:v1'],
      ]));
      expect(calls.find((c) => c[0] === 'metin2_db')).toBeUndefined(); // db-process (dbRepo) dokunulmaz
      expect(calls.find((c) => c[0] === 'metin2_database')).toBeUndefined(); // mariadb dokunulmaz
      expect(calls.every((c) => c[1].startsWith('ghcr.io/changeme/metin2-game:'))).toBe(true);
      expect(events.some((e) => e.type === 'done')).toBe(true);
    });

    it('startDeploy(game): healthcheck sadece recreate edilen game konteynerleri için yapılır (metin2_db poll edilmez)', async () => {
      const recreator = { recreate: jest.fn().mockResolvedValue(undefined) };
      const c = containers();
      const svc = new DeployService(repo(), c, recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      const { jobId } = await svc.startDeploy('game', 'v1', 'u1');
      const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
      const healthNames = c.getHealth.mock.calls.map((args: any[]) => args[0]);
      expect(healthNames).toEqual(expect.arrayContaining(['metin2_auth', 'metin2_ch1']));
      expect(healthNames).not.toContain('metin2_db');
      expect(events.some((e) => e.type === 'done')).toBe(true);
    });

    it('startDeploy(db): sadece db repo konteynerini recreate eder, gameRepo dokunulmaz, done', async () => {
      const calls: any[] = [];
      const recreator = { recreate: jest.fn(async (n, img) => { calls.push([n, img]); }) };
      const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      const { jobId } = await svc.startDeploy('db', 'v1', 'u1');
      const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
      expect(calls).toEqual([['metin2_db', 'ghcr.io/changeme/metin2-db:v1']]);
      expect(calls.every((c) => c[1].startsWith('ghcr.io/changeme/metin2-db:'))).toBe(true);
      expect(events.some((e) => e.type === 'done')).toBe(true);
    });

    it('Deployment kaydına kind yazılır', async () => {
      const r = repo();
      const recreator = { recreate: jest.fn().mockResolvedValue(undefined) };
      const svc = new DeployService(r, containers(), recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      await svc.startDeploy('db', 'v1', 'u1');
      expect(r.save).toHaveBeenCalledWith(expect.objectContaining({ kind: 'db', toTag: 'v1' }));
    });

    it('recreate hatası (game): fromTag\'e geri recreate (rollback), failed', async () => {
      let n = 0;
      const recreator = { recreate: jest.fn(async () => { if (n++ === 1) throw new Error('boom'); }) };
      const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      const { jobId } = await svc.startDeploy('game', 'v1', 'u1');
      const events = await firstValueFrom(svc.streamJob(jobId).pipe(toArray()));
      expect(events.some((e) => e.type === 'rollback')).toBe(true);
      expect(events.some((e) => e.type === 'failed')).toBe(true);
    });

    it('geçersiz tag → reddedilir', async () => {
      const ts = {
        listTags: jest.fn().mockResolvedValue({
          game: [{ name: 'v1', deployable: false }],
          db: [{ name: 'v1', deployable: true }],
          currentGame: 'latest',
          currentDb: 'latest',
        }),
      } as any;
      const svc = new DeployService(repo(), containers(), { recreate: jest.fn() } as any, ts, cfg, dockerStub(), auditStub(), notesStub());
      await expect(svc.startDeploy('game', 'v1', 'u1')).rejects.toMatchObject({ response: { code: 'invalid_tag' }, status: 400 });
    });

    it('aktif deploy varken ikinci istek → deploy_in_progress (409)', async () => {
      const recreator = { recreate: jest.fn(() => new Promise<void>(() => {})) }; // asla bitmez
      const svc = new DeployService(repo(), containers(), recreator as any, tagService(), cfg, dockerStub(), auditStub(), notesStub());
      await svc.startDeploy('game', 'v1', 'u1');
      await expect(svc.startDeploy('db', 'v1', 'u1')).rejects.toMatchObject({ response: { code: 'deploy_in_progress' }, status: 409 });
    });
  });

  describe('deleteImage per-kind', () => {
    let service: DeployService;
    let docker: any;
    let audit: any;

    beforeEach(() => {
      docker = {};
      audit = { record: jest.fn().mockResolvedValue(undefined) };
      service = new DeployService(repo(), containers(), { recreate: jest.fn() } as any, tagService(), cfg, docker, audit, notesStub());
    });

    it('deleteImage(game, tag) sadece gameRepo image siler + audit, userId actor.id\'den gelir', async () => {
      const remove = jest.fn().mockResolvedValue(undefined);
      docker.getImage = jest.fn().mockReturnValue({ remove });
      await service.deleteImage('game', 'v1', { id: 'u1', username: 'admin' } as any);
      expect(docker.getImage).toHaveBeenCalledTimes(1);
      expect(docker.getImage).toHaveBeenCalledWith('ghcr.io/changeme/metin2-game:v1');
      expect(remove).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'image_delete', userId: 'u1', target: 'game:v1' }));
    });

    it('deleteImage(db, tag) sadece dbRepo image siler + audit', async () => {
      const remove = jest.fn().mockResolvedValue(undefined);
      docker.getImage = jest.fn().mockReturnValue({ remove });
      await service.deleteImage('db', 'v1', { id: 'u1', username: 'admin' } as any);
      expect(docker.getImage).toHaveBeenCalledTimes(1);
      expect(docker.getImage).toHaveBeenCalledWith(`${cfg.dbRepo}:v1`);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'image_delete', userId: 'u1', target: 'db:v1' }));
    });

    it('deleteImage userId actor.sub fallback (id yoksa)', async () => {
      const remove = jest.fn().mockResolvedValue(undefined);
      docker.getImage = jest.fn().mockReturnValue({ remove });
      await service.deleteImage('game', 'v1', { sub: 'u2', username: 'admin' } as any);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }));
    });

    it('deleteImage in-use (409) → image_in_use', async () => {
      const err: any = new Error('c'); err.statusCode = 409;
      docker.getImage = jest.fn().mockReturnValue({ remove: jest.fn().mockRejectedValue(err) });
      await expect(service.deleteImage('game', 'latest', { id: 'u1', username: 'admin' } as any)).rejects.toMatchObject({ status: 409, response: { code: 'image_in_use' } });
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'image_delete', result: 'failure', target: 'game:latest' }));
    });

    it('deleteImage non-409 hata (ör. 404 not-found) → orijinal hata fırlatılır + failure audit yazılır', async () => {
      const err: any = new Error('no such image'); err.statusCode = 404;
      docker.getImage = jest.fn().mockReturnValue({ remove: jest.fn().mockRejectedValue(err) });
      await expect(service.deleteImage('game', 'v1', { id: 'u1', username: 'admin' } as any)).rejects.toBe(err);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'image_delete', result: 'failure', target: 'game:v1' }));
    });
  });

  describe('updateNote', () => {
    let service: DeployService;
    let notes: any;
    let audit: any;

    beforeEach(() => {
      notes = notesStub();
      audit = auditStub();
      service = new DeployService(repo(), containers(), { recreate: jest.fn() } as any, tagService(), cfg, dockerStub(), audit, notes);
    });

    it('updateNote > 2000 char → note_too_long (400)', async () => {
      await expect(service.updateNote('game', 'v1', 'x'.repeat(2001), { id: 'u1', username: 'a' } as any))
        .rejects.toMatchObject({ status: 400, response: { code: 'note_too_long' } });
      expect(notes.upsert).not.toHaveBeenCalled();
    });

    it('updateNote tam 2000 karakter → kabul edilir (sınır dahil)', async () => {
      await expect(service.updateNote('game', 'v1', 'x'.repeat(2000), { id: 'u1', username: 'a' } as any)).resolves.toEqual({ ok: true });
    });

    it('updateNote upsert eder + audit note_update', async () => {
      await service.updateNote('game', 'v1', 'not', { id: 'u1', username: 'a' } as any);
      expect(notes.upsert).toHaveBeenCalledWith('game', 'v1', 'not', 'u1');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'note_update', target: 'game:v1' }));
    });

    it('updateNote userId actor.sub fallback (id yoksa)', async () => {
      await service.updateNote('db', 'v2', 'not', { sub: 'u2', username: 'a' } as any);
      expect(notes.upsert).toHaveBeenCalledWith('db', 'v2', 'not', 'u2');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2', target: 'db:v2' }));
    });
  });
});
