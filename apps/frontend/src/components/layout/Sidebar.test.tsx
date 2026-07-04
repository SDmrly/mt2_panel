// apps/frontend/src/components/layout/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

let mockRole = 'admin';
vi.mock('../../store/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { role: mockRole, username: 'test' } }) }));

afterEach(() => {
  mockRole = 'admin';
});

it('admin: Dashboard/Servisler/Loglar + Deploy/Geçmiş + Yönetim (Audit/Kullanıcılar) görünür', () => {
  mockRole = 'admin';
  render(<MemoryRouter><Sidebar /></MemoryRouter>);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Servisler')).toBeInTheDocument();
  expect(screen.getByText('Loglar')).toBeInTheDocument();
  expect(screen.getByText('Deploy')).toBeInTheDocument();
  expect(screen.getByText('Geçmiş')).toBeInTheDocument();
  expect(screen.getByText('Audit')).toBeInTheDocument();
  expect(screen.getByText('Kullanıcılar')).toBeInTheDocument();
});

it('non-admin (viewer): Dashboard/Servisler/Loglar görünür, Deploy/Geçmiş/Audit/Kullanıcılar görünmez', () => {
  mockRole = 'viewer';
  render(<MemoryRouter><Sidebar /></MemoryRouter>);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Servisler')).toBeInTheDocument();
  expect(screen.getByText('Loglar')).toBeInTheDocument();
  expect(screen.queryByText('Deploy')).not.toBeInTheDocument();
  expect(screen.queryByText('Geçmiş')).not.toBeInTheDocument();
  expect(screen.queryByText('Audit')).not.toBeInTheDocument();
  expect(screen.queryByText('Kullanıcılar')).not.toBeInTheDocument();
});
