import { render, screen } from '@testing-library/react';
import { Gauge } from './Gauge';

it('yüzde ve label gösterir', () => {
  render(<Gauge value={34} label="CPU" color="#34d399" />);
  expect(screen.getByText('34%')).toBeInTheDocument();
  expect(screen.getByText('CPU')).toBeInTheDocument();
});
