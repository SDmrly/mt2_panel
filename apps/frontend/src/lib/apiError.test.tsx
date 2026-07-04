// apps/frontend/src/lib/apiError.test.tsx
import { apiErrorText } from './apiError';

const t = ((key: string, opts?: { defaultValue?: string }) => {
  const dict: Record<string, string> = {
    'errors.invalid_credentials': 'Kullanıcı adı veya şifre hatalı',
    'errors.generic': 'İşlem başarısız',
  };
  if (key in dict) return dict[key];
  return opts?.defaultValue ?? key;
}) as any;

describe('apiErrorText', () => {
  it('code varsa ve çevirisi mevcutsa çeviriyi döner', () => {
    const err = { response: { data: { code: 'invalid_credentials', message: 'Kullanıcı adı veya şifre hatalı' } } };
    expect(apiErrorText(err, t)).toBe('Kullanıcı adı veya şifre hatalı');
  });

  it('code çevirisi yoksa backend message fallback olur', () => {
    const err = { response: { data: { code: 'unknown_code', message: 'Backend özel mesaj' } } };
    expect(apiErrorText(err, t)).toBe('Backend özel mesaj');
  });

  it('code yoksa data.message döner', () => {
    const err = { response: { data: { message: 'Sade mesaj' } } };
    expect(apiErrorText(err, t)).toBe('Sade mesaj');
  });

  it('hiçbir şey yoksa generic döner', () => {
    expect(apiErrorText({}, t)).toBe('İşlem başarısız');
    expect(apiErrorText(undefined, t)).toBe('İşlem başarısız');
  });
});
