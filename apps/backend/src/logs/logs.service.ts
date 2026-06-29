// apps/backend/src/logs/logs.service.ts
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContainersService } from '../containers/containers.service';
import { parseLogLine } from './log-parser';
import { LogMessage } from './types';

/** streamLogs başlangıcında container'dan geriye dönük çekilecek satır sayısı. */
const STREAM_INITIAL_TAIL = 200;
/** Live batch flush aralığı (ms). */
const BATCH_INTERVAL_MS = 100;

@Injectable()
export class LogsService {
  constructor(private readonly containers: ContainersService) {}

  async tailLogs(name: string, tail: number): Promise<LogMessage[]> {
    const container = await this.containers.findContainerByService(name);
    const result = await container.logs({
      follow: false, stdout: true, stderr: true, tail,
    });
    const buf = await toBuffer(result);
    const { text } = demuxFrames(buf);
    return text.split('\n').filter((l) => l.length > 0)
      .map((l) => parseLogLine(l, name));
  }

  streamLogs(name: string): Observable<LogMessage[]> {
    return new Observable<LogMessage[]>((subscriber) => {
      let stream: NodeJS.ReadableStream & { destroy?: () => void };
      let cancelled = false;
      // Byte seviyesinde carryover: yarım gelen Docker frame'leri (header veya
      // payload iki TCP chunk'a bölündüğünde) bir sonraki chunk'a taşı.
      let pending: Buffer = Buffer.alloc(0);
      // Metin seviyesinde carryover: tam frame'lerden çıkmış ama henüz '\n'
      // görmemiş kısmi satır.
      let partial = '';
      let batch: LogMessage[] = [];
      let timer: NodeJS.Timeout | null = null;

      const flush = () => {
        if (batch.length) { subscriber.next(batch); batch = []; }
        timer = null;
      };
      const onData = (chunk: Buffer) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
        pending = pending.length ? Buffer.concat([pending, buf]) : buf;
        // Sadece TAM frame'leri demux et; eksik frame `pending`'de kalır.
        const { text, rest } = demuxFrames(pending);
        pending = rest;
        partial += text;
        const parts = partial.split('\n');
        partial = parts.pop() ?? '';
        for (const line of parts) {
          if (line.length) batch.push(parseLogLine(line, name));
        }
        if (!timer) timer = setTimeout(flush, BATCH_INTERVAL_MS);
      };

      this.containers.findContainerByService(name)
        .then((container) => container.logs({
          follow: true, stdout: true, stderr: true, tail: STREAM_INITIAL_TAIL,
        }))
        .then((s: any) => {
          if (cancelled) { s.destroy?.(); return; }
          stream = s;
          stream.on('data', onData);
          stream.on('error', (e: Error) => subscriber.error(e));
          stream.on('end', () => { flush(); subscriber.complete(); });
        })
        .catch((e) => subscriber.error(e));

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        stream?.destroy?.();
      };
    });
  }
}

/**
 * container.logs(follow:false) ya hazır bir Buffer ya da (bazı
 * dockerode/test senaryolarında) bir Readable stream döndürebilir.
 * Her iki durumu da tek bir Buffer'a indirger.
 */
async function toBuffer(result: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(result)) return result;
  if (typeof result === 'string') return Buffer.from(result, 'utf8');
  if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of result as AsyncIterable<Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
    }
    return Buffer.concat(chunks);
  }
  return Buffer.from(String(result ?? ''), 'utf8');
}

/**
 * Docker logs frame-aware demux (incremental / carryover destekli).
 *
 * Docker'ın multiplexed log stream'i her payload'ın başına 8 byte'lık bir
 * header koyar: [stream_type(1)][0][0][0][size(4, big-endian)]. Burada
 * stream_type ∈ {0=stdin, 1=stdout, 2=stderr}. TTY açık container'larda veya
 * düz metin testlerinde header yoktur; baytlar header gibi görünmüyorsa kalan
 * tampon olduğu gibi düz metin kabul edilir (boşluk/tireler korunur).
 *
 * Dönüş:
 *  - `text`: demux edilmiş, TAM frame'lerden (ve düz metin segmentinden)
 *    çıkmış UTF-8 metin.
 *  - `rest`: HENÜZ TAMAMLANMAMIŞ bir frame'in baytları (header'ın tamamı ya da
 *    payload'ın tamamı gelmemiş). Streaming'de bir sonraki chunk'a taşınır.
 *    Tam buffer'larda (tail) boş döner.
 */
function demuxFrames(buf: Buffer): { text: string; rest: Buffer } {
  let out = '';
  let i = 0;
  while (i < buf.length) {
    const type = buf[i];
    const looksLikeHeaderStart =
      (type === 0 || type === 1 || type === 2);
    if (looksLikeHeaderStart && i + 8 > buf.length) {
      // Olası bir header'ın tamamı henüz gelmedi → carryover.
      return { text: out, rest: buf.subarray(i) };
    }
    if (isFrameHeader(buf, i)) {
      const size = buf.readUInt32BE(i + 4);
      const start = i + 8;
      const end = start + size;
      if (end > buf.length) {
        // Payload'ın tamamı henüz gelmedi → header dahil carryover.
        return { text: out, rest: buf.subarray(i) };
      }
      out += buf.toString('utf8', start, end);
      i = end;
    } else {
      // Düz metin: kalanın tamamını olduğu gibi al.
      out += buf.toString('utf8', i);
      i = buf.length;
    }
  }
  return { text: out, rest: Buffer.alloc(0) };
}

function isFrameHeader(buf: Buffer, i: number): boolean {
  if (i + 8 > buf.length) return false;
  const type = buf[i];
  return (
    (type === 0 || type === 1 || type === 2) &&
    buf[i + 1] === 0 &&
    buf[i + 2] === 0 &&
    buf[i + 3] === 0
  );
}
