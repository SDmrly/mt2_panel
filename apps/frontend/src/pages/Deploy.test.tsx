// apps/frontend/src/pages/Deploy.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Deploy from './Deploy';

vi.mock('../hooks/useDeployTags', () => ({
  useDeployTags: () => ({ data: { tags: [{ name: 'latest', deployable: true }, { name: 'v1', deployable: true }], current: 'latest' }, isLoading: false }),
}));
vi.mock('../hooks/useDeployStream', () => ({ useDeployStream: () => ({ events: [], status: 'idle' }) }));

it('çalışan tag ve deploy butonunu gösterir', () => {
  const qc = new QueryClient();
  render(<QueryClientProvider client={qc}><MemoryRouter><Deploy /></MemoryRouter></QueryClientProvider>);
  expect(screen.getAllByText(/latest/)[0]).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
});
