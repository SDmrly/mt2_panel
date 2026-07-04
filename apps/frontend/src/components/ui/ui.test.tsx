// apps/frontend/src/components/ui/ui.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog';

it('Button tıklanabilir ve içeriğini gösterir', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Kaydet</Button>);
  const btn = screen.getByRole('button', { name: 'Kaydet' });
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('Dialog tetiklendiğinde içeriği açılır', () => {
  render(
    <Dialog>
      <DialogTrigger>Aç</DialogTrigger>
      <DialogContent>
        <DialogTitle>Başlık</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
  expect(screen.queryByText('Başlık')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Aç'));
  expect(screen.getByText('Başlık')).toBeInTheDocument();
});
