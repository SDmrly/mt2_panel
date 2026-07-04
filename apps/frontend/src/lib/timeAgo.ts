// apps/frontend/src/lib/timeAgo.ts
import type { TFunction } from 'i18next';

export function timeAgo(iso: string, t: TFunction): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('time.secondsAgo', { count: s });
  const m = Math.floor(s / 60); if (m < 60) return t('time.minutesAgo', { count: m });
  const h = Math.floor(m / 60); if (h < 24) return t('time.hoursAgo', { count: h });
  const d = Math.floor(h / 24); return t('time.daysAgo', { count: d });
}
