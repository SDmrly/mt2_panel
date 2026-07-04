// apps/backend/src/system/system.service.spec.ts
import { SystemService } from './system.service';

const cards = [
  { name: 'metin2_ch1', role: 'channel', status: 'running' },
  { name: 'metin2_db', role: 'db-process', status: 'running' },
];
const containers = () => ({
  discoverServices: jest.fn().mockResolvedValue(cards),
  getStats: jest.fn().mockResolvedValue({ cpuPercent: 10, memUsedMb: 512, memLimitMb: 2048, networkRxMb: 1, networkTxMb: 0.5 }),
}) as any;
const docker = () => ({
  info: jest.fn().mockResolvedValue({ MemTotal: 16 * 1024 * 1024 * 1024, NCPU: 4 }),
  df: jest.fn().mockResolvedValue({ LayersSize: 50 * 1024 * 1024 * 1024 }),
}) as any;

describe('SystemService.overview', () => {
  it('container stat toplamı + info + df → alanlar', async () => {
    const svc = new SystemService(docker(), containers());
    const o = await svc.overview();
    expect(o.memTotalMb).toBe(16384);
    // cpuSum = 10 + 10 = 20, NCPU = 4 → 20/4 = 5 (host çekirdek sayısına normalize edilmiş, deterministik)
    expect(o.cpuPercent).toBe(5);
    expect(o.containers).toHaveLength(2);
    expect(o.containers[0]).toMatchObject({ name: 'metin2_ch1', cpuPercent: expect.any(Number) });
    // first call: no previous sample → net rate is 0
    expect(o.netRxMbps).toBe(0);
    expect(o.netTxMbps).toBe(0);
  });

  it('ikinci çağrıda netRxMbps/netTxMbps gerçek oran (>= 0) döner', async () => {
    const svc = new SystemService(docker(), containers());
    // Manually seed prevNet with lower cumulative values 1 second ago
    // Second call will see rx=2, tx=1 (2 containers × networkRxMb:1, networkTxMb:0.5)
    // delta rx = 2-0 = 2 Mb over 1s → netRxMbps = 2; delta tx = 1-0 = 1 Mb over 1s → netTxMbps = 1
    (svc as any).prevNet = { rx: 0, tx: 0, at: Date.now() - 1000 };
    const o2 = await svc.overview();
    expect(o2.netRxMbps).toBeGreaterThan(0);
    expect(o2.netTxMbps).toBeGreaterThan(0);
  });

  it('MemTotal bilinmiyorsa (0) memPercent absürt değer üretmez, memTotalMb 0 kalır', async () => {
    const dockerMock = {
      info: jest.fn().mockResolvedValue({ MemTotal: 0, NCPU: 4 }),
      df: jest.fn().mockResolvedValue({ LayersSize: 0 }),
    } as any;
    const svc = new SystemService(dockerMock, containers());
    const o = await svc.overview();
    expect(o.memTotalMb).toBe(0);
    expect(o.containers.every((c) => c.memPercent === 0)).toBe(true);
  });

  it('TTL içinde ardışık çağrılar aynı snapshot döner ve info/df/getStats tekrar çağrılmaz (cache + prevNet race fix)', async () => {
    const containersMock = containers();
    const dockerMock = docker();
    const svc = new SystemService(dockerMock, containersMock);

    const [o1, o2] = await Promise.all([svc.overview(), svc.overview()]);
    const o3 = await svc.overview();

    expect(o1).toBe(o2);
    expect(o1).toBe(o3);
    expect(dockerMock.info).toHaveBeenCalledTimes(1);
    expect(dockerMock.df).toHaveBeenCalledTimes(1);
    // 2 running containers → getStats called exactly once per container across all 3 calls
    expect(containersMock.getStats).toHaveBeenCalledTimes(2);
  });
});
