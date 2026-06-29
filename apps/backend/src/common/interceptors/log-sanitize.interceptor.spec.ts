// apps/backend/src/common/interceptors/log-sanitize.interceptor.spec.ts
import { sanitize } from './log-sanitize.interceptor';
describe('sanitize', () => {
  it('hassas alanları maskeler', () => {
    expect(sanitize({ username: 'a', password: 'p', token: 't', x: 1 }))
      .toEqual({ username: 'a', password: '***', token: '***', x: 1 });
  });
});

import { LogSanitizeInterceptor } from './log-sanitize.interceptor';
import { of } from 'rxjs';

describe('LogSanitizeInterceptor', () => {
  it('request body hassas alanlarını maskeler (log için), response\'u değiştirmez', (done) => {
    const interceptor = new LogSanitizeInterceptor();
    const req: any = { method: 'POST', url: '/auth/login', body: { username: 'a', password: 'p' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    const next: any = { handle: () => of({ ok: true }) };
    interceptor.intercept(ctx, next).subscribe((res) => {
      expect(res).toEqual({ ok: true });        // response dokunulmaz
      expect((interceptor as any).lastSanitized).toEqual({ username: 'a', password: '***' });
      done();
    });
  });
});
