// apps/frontend/src/pages/Deploy.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Deploy from './Deploy';

vi.mock('../hooks/useDeployTags', () => ({
  useDeployTags: () => ({
    data: {
      game: [
        { name: 'latest', isRunning: true, sizeMb: 202, createdAt: '2026-07-01T10:00:00Z', deployable: false },
        { name: 'v1', isRunning: false, sizeMb: 200, createdAt: '2026-07-01T09:00:00Z', deployable: true },
      ],
      db: [
        { name: 'd1', isRunning: true, sizeMb: 80, createdAt: '2026-07-01T08:00:00Z', deployable: false },
      ],
      currentGame: 'latest',
      currentDb: 'd1',
    },
    isLoading: false,
    refetch: () => {},
  }),
}));
vi.mock('../hooks/useDeployStream', () => ({ useDeployStream: () => ({ events: [], status: 'idle' }) }));

function renderDeploy() {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Deploy /></MemoryRouter></QueryClientProvider>);
}

it('Game ve DB için iki tablo, tag + boyut + çalışıyor rozeti gösterir', () => {
  renderDeploy();
  expect(screen.getByText(/Game Images/i)).toBeInTheDocument();
  expect(screen.getByText(/DB Images/i)).toBeInTheDocument();
  expect(screen.getByText('latest')).toBeInTheDocument();
  expect(screen.getByText('d1')).toBeInTheDocument();
  expect(screen.getByText(/202 MB/)).toBeInTheDocument();
  expect(screen.getAllByText('çalışıyor').length).toBeGreaterThanOrEqual(1);
});
