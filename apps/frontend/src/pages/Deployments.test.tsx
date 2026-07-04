// apps/frontend/src/pages/Deployments.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Deployments from './Deployments';
import { apiClient } from '../lib/api';

vi.mock('../hooks/useDeployments', () => ({
  useDeployments: () => ({
    data: [
      { id: 'd1', kind: 'game', serviceScope: 'all-game', fromTag: 'latest', toTag: 'v1', status: 'success', step: null, error: null, userId: 'u1', startedAt: '2026-06-29T10:00:00Z', finishedAt: '2026-06-29T10:01:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useDeployTags', () => ({
  useDeployTags: () => ({
    data: {
      game: [{ name: 'v1', createdAt: '2026-06-29T09:00:00Z', sizeMb: 100, isRunning: true, deployable: true, note: 'sürüm notu' }],
      db: [],
      currentGame: 'v1',
      currentDb: null,
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  apiClient: { post: vi.fn().mockResolvedValue({ data: { jobId: 'j1' } }) },
}));

function renderPage() {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Deployments /></MemoryRouter></QueryClientProvider>);
}

it('geçmiş satırını ve rollback butonunu gösterir', () => {
  renderPage();
  expect(screen.getByText(/v1/)).toBeInTheDocument();
  expect(screen.getByText(/success/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /geri al/i })).toBeInTheDocument();
});

it('geçmiş satırında toTag notu gösterilir', () => {
  renderPage();
  expect(screen.getByText(/sürüm notu/)).toBeInTheDocument();
});

it('rollback bir onay dialogu açar, onaylayınca mutasyonu çağırır', async () => {
  renderPage();
  fireEvent.click(screen.getAllByRole('button', { name: /geri al/i })[0]);
  expect(await screen.findByText(/geri alınsın mı/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^geri al$|onayla/i }));
  await waitFor(() => {
    expect(apiClient.post).toHaveBeenCalledWith('/deploy', { kind: 'game', tag: 'latest' });
  });
});
