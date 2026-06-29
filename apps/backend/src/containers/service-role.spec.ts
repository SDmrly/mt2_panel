// apps/backend/src/containers/service-role.spec.ts
import { resolveRole } from './service-role';
describe('resolveRole', () => {
  it('isim bazlı: database/haproxy/quest-compiler', () => {
    expect(resolveRole('metin2_database', undefined)).toBe('database');
    expect(resolveRole('haproxy', undefined)).toBe('proxy');
    expect(resolveRole('quest-compiler', 'core')).toBe('quest-compiler'); // isim önceliklidir
  });
  it('MT2_ROLE bazlı: db/auth/core', () => {
    expect(resolveRole('metin2_db', 'db')).toBe('db-process');
    expect(resolveRole('metin2_auth', 'auth')).toBe('auth');
    expect(resolveRole('metin2_ch1', 'core')).toBe('channel');
    expect(resolveRole('metin2_ch99', 'core')).toBe('channel');
  });
  it('bilinmeyen → channel fallback', () => {
    expect(resolveRole('metin2_weird', undefined)).toBe('channel');
  });
});
