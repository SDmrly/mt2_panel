import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPref, setPref, resolve, applyTheme } from './theme';

function mockMatch(dark: boolean) {
  (window as any).matchMedia = vi.fn().mockReturnValue({
    matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  });
}

describe('theme', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });

  it('varsayılan pref system', () => { expect(getPref()).toBe('system'); });
  it('resolve explicit light/dark', () => { expect(resolve('light')).toBe('light'); expect(resolve('dark')).toBe('dark'); });
  it('resolve system OS koyuysa dark', () => { mockMatch(true); expect(resolve('system')).toBe('dark'); });
  it('resolve system OS açıksa light', () => { mockMatch(false); expect(resolve('system')).toBe('light'); });
  it('setPref localStorage + attribute yazar', () => {
    mockMatch(false); setPref('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('applyTheme mevcut pref üzerinden attribute yazar', () => {
    mockMatch(true);
    localStorage.setItem('theme', 'system');
    applyTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
