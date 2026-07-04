import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
vi.mock('../hooks/useSystemOverview', () => ({
  useSystemOverview: () => ({ data: {
    cpuPercent: 34, memUsedMb: 9216, memTotalMb: 16384, diskUsedGb: 50, diskTotalGb: 0, netRxMbps: 12.4, netTxMbps: 3.1,
    containers: [{ name: 'metin2_ch1', role: 'channel', status: 'running', cpuPercent: 34, memPercent: 57 }],
  }, isLoading: false }),
}));
it('performans + container kutusu gösterir', () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  expect(screen.getByText('Performans')).toBeInTheDocument();
  expect(screen.getByText('metin2_ch1')).toBeInTheDocument();
});
