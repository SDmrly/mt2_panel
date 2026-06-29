// apps/backend/src/logs/logs.service.spec.ts
import { Readable } from 'stream';
import { firstValueFrom, toArray } from 'rxjs';
import { LogsService } from './logs.service';

function fakeContainersSvc(stream: Readable) {
  const container = {
    logs: jest.fn().mockResolvedValue(stream),
    modem: { demuxStream: undefined },
  };
  return { findContainerByService: jest.fn().mockResolvedValue(container), _container: container } as any;
}

describe('LogsService.tailLogs', () => {
  it('satırları parse edip LogMessage[] döner', async () => {
    const data = '[2026-06-28 06:51:27] [game] [error] [a.cpp:1] boom\n[2026-06-28 06:51:28] [game] [info] ok\n';
    const stream = Readable.from([Buffer.from(data)]);
    const svc = new LogsService(fakeContainersSvc(stream));
    const lines = await svc.tailLogs('metin2_ch1', 200);
    expect(lines).toHaveLength(2);
    expect(lines[0].level).toBe('error');
    expect(lines[1].level).toBe('info');
  });
});

describe('LogsService.tailLogs (Docker multiplexed frame)', () => {
  it("8-byte frame header'lı payload'ı boşluk/tireleri bozmadan parse eder", async () => {
    const payload = Buffer.from(
      '[2026-06-28 06:51:27] [game] [error] [a.cpp:1] boom\n',
      'utf8',
    );
    const header = Buffer.alloc(8);
    header[0] = 1; // stdout
    header.writeUInt32BE(payload.length, 4);
    const framed = Buffer.concat([header, payload]);
    const container = { logs: jest.fn().mockResolvedValue(framed), modem: {} };
    const cs = { findContainerByService: jest.fn().mockResolvedValue(container) } as any;
    const svc = new LogsService(cs);
    const lines = await svc.tailLogs('metin2_ch1', 200);
    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe('error');
    expect(lines[0].timestamp).toBe('2026-06-28 06:51:27');
    expect(lines[0].message).toContain('boom');
  });
});

describe('LogsService.streamLogs', () => {
  it('stream satırlarını batch olarak emit eder ve abone bitince destroy çağırır', async () => {
    const stream = Readable.from([Buffer.from('[t] [game] [info] a\n[t] [game] [error] b\n')]);
    (stream as any).destroy = jest.fn((stream as any).destroy?.bind(stream));
    const cs = fakeContainersSvc(stream);
    const svc = new LogsService(cs);
    const batches = await firstValueFrom(svc.streamLogs('metin2_ch1').pipe(toArray()));
    const flat = batches.flat();
    expect(flat.map((l) => l.level)).toEqual(expect.arrayContaining(['info', 'error']));
    expect((stream as any).destroy).toHaveBeenCalled();
  });

  it('iki chunk arasına bölünmüş Docker frame header\'ını doğru birleştirir', async () => {
    const payload = Buffer.from(
      '[2026-06-28 06:51:27] [game] [error] [a.cpp:1] boom\n',
      'utf8',
    );
    const header = Buffer.alloc(8);
    header[0] = 1; // stdout
    header.writeUInt32BE(payload.length, 4);
    const framed = Buffer.concat([header, payload]);
    // Header'ı ortadan kes: ilk chunk header'ın ilk 4 byte'ı,
    // ikinci chunk kalan 4 byte header + tüm payload.
    const chunk1 = framed.subarray(0, 4);
    const chunk2 = framed.subarray(4);
    const stream = Readable.from([chunk1, chunk2]);
    (stream as any).destroy = jest.fn((stream as any).destroy?.bind(stream));
    const container = { logs: jest.fn().mockResolvedValue(stream), modem: {} };
    const cs = { findContainerByService: jest.fn().mockResolvedValue(container) } as any;
    const svc = new LogsService(cs);
    const batches = await firstValueFrom(svc.streamLogs('metin2_ch1').pipe(toArray()));
    const flat = batches.flat();
    expect(flat).toHaveLength(1);
    expect(flat[0].level).toBe('error');
    expect(flat[0].timestamp).toBe('2026-06-28 06:51:27');
    expect(flat[0].message).toContain('boom');
  });
});
