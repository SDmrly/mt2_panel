// apps/backend/src/common/app-exception.spec.ts
import { HttpStatus } from '@nestjs/common';
import { AppException } from './app-exception';

it('code + message + status taşır', () => {
  const e = new AppException('account_not_approved', HttpStatus.FORBIDDEN, 'Hesap onaylı değil');
  expect(e.getStatus()).toBe(403);
  expect(e.getResponse()).toMatchObject({ code: 'account_not_approved', message: 'Hesap onaylı değil' });
});
it('message verilmezse code fallback olur', () => {
  const e = new AppException('x', HttpStatus.BAD_REQUEST);
  expect(e.getResponse()).toMatchObject({ code: 'x', message: 'x' });
});
it('response body statusCode taşır', () => {
  const e = new AppException('invalid_credentials', HttpStatus.UNAUTHORIZED, 'Kullanıcı adı veya şifre hatalı');
  expect(e.getResponse()).toMatchObject({ statusCode: 401, code: 'invalid_credentials', message: 'Kullanıcı adı veya şifre hatalı' });
});
