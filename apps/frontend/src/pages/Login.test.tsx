// apps/frontend/src/pages/Login.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
it('login formu kullanıcı adı + şifre alanı gösterir', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByLabelText(/kullanıcı adı/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /giriş/i })).toBeInTheDocument();
});
it('boş submit hata gösterir', async () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /giriş/i }));
  expect(await screen.findByText(/zorunlu/i)).toBeInTheDocument();
});
