// apps/backend/src/logs/log-parser.spec.ts
import { parseLogLine } from './log-parser';
describe('parseLogLine', () => {
  it('Metin2 formatını parse eder (location dahil)', () => {
    const r = parseLogLine('[2026-06-28 06:51:27] [game] [error] [input.cpp:637] Handshake fail', 'metin2_ch1');
    expect(r.timestamp).toBe('2026-06-28 06:51:27');
    expect(r.component).toBe('game');
    expect(r.level).toBe('error');
    expect(r.location).toBe('input.cpp:637');
    expect(r.message).toBe('Handshake fail');
    expect(r.containerName).toBe('metin2_ch1');
  });
  it('location olmadan parse eder', () => {
    const r = parseLogLine('[2026-06-28 06:51:27] [game] [info] Sunucu başladı', 'metin2_ch1');
    expect(r.level).toBe('info'); expect(r.location).toBeNull();
    expect(r.message).toBe('Sunucu başladı');
  });
  it('level normalize: warning/syserr', () => {
    expect(parseLogLine('[t] [c] [warning] x', 'n').level).toBe('warning');
    expect(parseLogLine('[t] [c] [SYSERR] x', 'n').level).toBe('error');
  });
  it('gcc/quest satırı: error: kelimesi', () => {
    const r = parseLogLine('quest.cpp:12:3: error: expected ;', 'quest-compiler');
    expect(r.level).toBe('error'); expect(r.timestamp).toBeNull(); expect(r.message).toBe('quest.cpp:12:3: error: expected ;');
  });
  it('tanınmayan satır → unknown, message=raw', () => {
    const r = parseLogLine('rastgele çıktı', 'n');
    expect(r.level).toBe('unknown'); expect(r.message).toBe('rastgele çıktı'); expect(r.raw).toBe('rastgele çıktı');
  });
});
