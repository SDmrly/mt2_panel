// apps/frontend/src/lib/apiError.ts
import type { TFunction } from 'i18next';

export function apiErrorText(err: any, t: TFunction): string {
  const d = err?.response?.data;
  if (d?.code) return t(`errors.${d.code}`, { defaultValue: d.message ?? t('errors.generic') });
  return d?.message ?? t('errors.generic');
}
