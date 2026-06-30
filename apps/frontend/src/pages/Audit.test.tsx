// apps/frontend/src/pages/Audit.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Audit from './Audit';

vi.mock('../hooks/useAudit', () => ({
  useAudit: () => ({ data: { rows: [
    { id: 'a1', createdAt: '2026-06-30T10:00:00Z', action: 'login_failed', userId: null, username: 'hacker', target: null, result: 'failure', ip: '1.2.3.4', detail: null },
    { id: 'a2', createdAt: '2026-06-30T10:01:00Z', action: 'service_restart', userId: 'u1', username: 'admin', target: 'metin2_ch1', result: 'success', ip: '127.0.0.1', detail: null },
  ], total: 2 }, isLoading: false }),
}));

it('audit satırlarını gösterir (eylem, kullanıcı, sonuç)', () => {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Audit /></MemoryRouter></QueryClientProvider>);
  // 'login_failed' hem filtre <option>'unda hem tablo <td>'sinde var → en az 2 eşleşme (satır render edildi)
  expect(screen.getAllByText('login_failed').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('hacker')).toBeInTheDocument();
  expect(screen.getByText('metin2_ch1')).toBeInTheDocument();
  expect(screen.getByText(/failure/i)).toBeInTheDocument();
});
