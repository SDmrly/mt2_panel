import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Users from './Users';

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({ data: [
    { id: 'u1', username: 'bekleyen', email: 'b@x.com', status: 'pending', role: 'viewer', createdAt: '2026-06-30T10:00:00Z', lastLogin: null },
    { id: 'adm', username: 'admin', email: 'a@local', status: 'active', role: 'admin', createdAt: '2026-06-29T10:00:00Z', lastLogin: '2026-06-30T09:00:00Z' },
  ], isLoading: false, refetch: () => {} }),
}));
vi.mock('../store/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'adm', role: 'admin' } }) }));

it('kullanıcıları listeler; pending satırda Onayla görünür', () => {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Users /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByText('bekleyen')).toBeInTheDocument();
  expect(screen.getByText('b@x.com')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
});
