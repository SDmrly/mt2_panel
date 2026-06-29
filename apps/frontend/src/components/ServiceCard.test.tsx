// apps/frontend/src/components/ServiceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceCard } from './ServiceCard';
const base = { name: 'metin2_auth', role: 'auth' as const, status: 'running' as const,
  health: 'healthy' as const, uptime: 'Up 7h', image: { name: 'metin2-game', tag: 'latest' }, ports: ['30001/tcp'] };
it('servis adı, rol ve health gösterir', () => {
  render(<MemoryRouter><ServiceCard service={base} /></MemoryRouter>);
  expect(screen.getByText('metin2_auth')).toBeInTheDocument();
  expect(screen.getByText(/healthy/i)).toBeInTheDocument();
});
it('channel rolünde kanal numarası gösterir', () => {
  render(<MemoryRouter><ServiceCard service={{ ...base, name: 'metin2_ch1', role: 'channel', channel: 1 }} /></MemoryRouter>);
  expect(screen.getByText('channel · ch1')).toBeInTheDocument();
});
