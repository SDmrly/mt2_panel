// apps/frontend/src/pages/Pending.tsx
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';

export default function Pending() {
  const { t } = useTranslation();
  const clear = useAuthStore((s) => s.clear);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]" />
          <span className="font-extrabold text-lg text-[var(--heading)]">MT2 Panel</span>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm text-center space-y-4">
          <h1 className="text-xl font-bold text-[var(--heading)]">{t('auth.pendingTitle')}</h1>
          <p className="text-[var(--muted)]">{t('auth.pendingBody')}</p>
          <Button variant="outline" onClick={() => { clear(); window.location.href = '/login'; }}>{t('common.logout')}</Button>
        </div>
      </div>
    </div>
  );
}
