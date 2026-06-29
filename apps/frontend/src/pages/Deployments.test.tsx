// apps/frontend/src/pages/Deployments.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Deployments from './Deployments';

vi.mock('../hooks/useDeployments', () => ({
  useDeployments: () => ({ data: [
    { id: 'd1', serviceScope: 'all-game', fromTag: 'latest', toTag: 'v1', status: 'success', step: null, error: null, userId: 'u1', startedAt: '2026-06-29T10:00:00Z', finishedAt: '2026-06-29T10:01:00Z' },
  ], isLoading: false }),
}));

it('geçmiş satırını ve rollback butonunu gösterir', () => {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Deployments /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByText(/v1/)).toBeInTheDocument();
  expect(screen.getByText(/success/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /dön|rollback/i })).toBeInTheDocument();
});
