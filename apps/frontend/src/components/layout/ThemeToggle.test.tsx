import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  (window as any).matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

it('3 mod butonu; Koyu tıklanınca pref+attribute dark olur', () => {
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button', { name: /dark|koyu/i }));
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});
