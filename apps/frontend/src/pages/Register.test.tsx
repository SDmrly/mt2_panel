// apps/frontend/src/pages/Register.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
it('register formu username/email/şifre alanları + kayıt butonu', () => {
  render(<MemoryRouter><Register /></MemoryRouter>);
  expect(screen.getByLabelText(/kullanıcı adı/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /kayıt/i })).toBeInTheDocument();
});
