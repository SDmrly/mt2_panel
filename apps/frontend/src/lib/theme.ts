export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'theme';

export function getPref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  const mq = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  return mq ? (mq.matches ? 'dark' : 'light') : 'dark';
}

export function applyTheme(): void {
  document.documentElement.dataset.theme = resolve(getPref());
}

export function setPref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme();
}

let mqListener: ((e: MediaQueryListEvent) => void) | null = null;
export function initTheme(): void {
  applyTheme();
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq) return;
  if (mqListener) mq.removeEventListener?.('change', mqListener);
  mqListener = () => { if (getPref() === 'system') applyTheme(); };
  mq.addEventListener?.('change', mqListener);
}
