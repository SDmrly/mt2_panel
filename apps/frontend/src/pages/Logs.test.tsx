// apps/frontend/src/pages/Logs.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Logs from './Logs';

vi.mock('../hooks/useServices', () => ({
  useServices: () => ({ data: [
    { name: 'metin2_ch1', role: 'channel', channel: 1, status: 'running', health: 'healthy', uptime: '', image: { name: 'x', tag: 'y' }, ports: [] },
  ], isLoading: false, isError: false }),
}));
vi.mock('../hooks/useLogStream', () => ({
  useLogStream: () => ({ lines: [
    { containerName: 'metin2_ch1', timestamp: '2026-06-28 06:51:27', component: 'game', level: 'error', location: 'a.cpp:1', message: 'boom', raw: '' },
  ], status: 'open', clear: () => {} }),
}));

it('servis seçici ve log satırını gösterir', () => {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Logs /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByText('metin2_ch1')).toBeInTheDocument();
  expect(screen.getByText(/boom/)).toBeInTheDocument();
});
