// apps/frontend/src/components/logs/LogModal.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LogModal } from './LogModal';

vi.mock('../../hooks/useLogStream', () => ({
  useLogStream: () => ({
    lines: [
      { containerName: 'metin2_ch1', timestamp: 't', component: 'game', level: 'error', location: 'a.cpp:1', message: 'boom', raw: '' },
    ],
    status: 'open',
    clear: () => {},
  }),
}));

it('servis adını, canlı log satırını ve tam-ekran butonunu gösterir', () => {
  render(
    <MemoryRouter>
      <LogModal service="metin2_ch1" onClose={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.getByText('metin2_ch1')).toBeInTheDocument();
  expect(screen.getByText(/boom/)).toBeInTheDocument();
  expect(screen.getByTitle(/tam ekran/i)).toBeInTheDocument();
});

it('service null iken hiçbir şey render etmez', () => {
  const { container } = render(
    <MemoryRouter>
      <LogModal service={null} onClose={() => {}} />
    </MemoryRouter>,
  );
  expect(container).toBeEmptyDOMElement();
});
