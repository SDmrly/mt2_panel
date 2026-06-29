// apps/backend/src/common/interceptors/log-sanitize.interceptor.spec.ts
import { sanitize } from './log-sanitize.interceptor';
describe('sanitize', () => {
  it('hassas alanları maskeler', () => {
    expect(sanitize({ username: 'a', password: 'p', token: 't', x: 1 }))
      .toEqual({ username: 'a', password: '***', token: '***', x: 1 });
  });
});
