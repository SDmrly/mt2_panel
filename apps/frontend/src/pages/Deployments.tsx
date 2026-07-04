// apps/frontend/src/pages/Deployments.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { apiErrorText } from '../lib/apiError';
import { useDeployments } from '../hooks/useDeployments';
import { Deployment, DeployStatus } from '../types/deploy';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<DeployStatus, 'success' | 'destructive' | 'warning'> = {
  success: 'success',
  failed: 'destructive',
  rolled_back: 'warning',
  running: 'warning',
};

export default function Deployments() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useDeployments();
  const [busy, setBusy] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);

  if (isLoading || !data) return <p className="p-6 text-[var(--muted)]">{t('common.loading')}</p>;

  const confirmRollback = async () => {
    const target = rollbackTarget;
    if (!target?.fromTag) return;
    setRollbackTarget(null);
    setBusy(true);
    try {
      await apiClient.post('/deploy', { kind: target.kind, tag: target.fromTag });
      toast.success(t('deployments.rollbackStarted', { to: target.toTag, from: target.fromTag }));
      refetch();
    } catch (err: any) {
      toast.error(apiErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">{t('deployments.title')}</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] text-xs">
              <th className="py-1.5 font-medium">{t('deployments.date')}</th>
              <th className="font-medium">{t('deployments.change')}</th>
              <th className="font-medium">{t('deployments.kind')}</th>
              <th className="font-medium">{t('deployments.status')}</th>
              <th className="font-medium">{t('deployments.user')}</th>
              <th className="font-medium text-right">{t('deployments.action')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 text-[var(--muted)] text-xs">{new Date(d.startedAt).toLocaleString()}</td>
                <td className="font-mono text-[var(--foreground)]">{d.fromTag ?? '—'} → {d.toTag}</td>
                <td><Badge variant="outline">{d.kind}</Badge></td>
                <td>
                  <Badge variant={STATUS_VARIANT[d.status] ?? 'outline'}>{d.status}</Badge>
                  {d.error && (
                    <div className="text-[10px] text-[var(--destructive)] max-w-xs truncate" title={d.error}>
                      {d.error}
                    </div>
                  )}
                </td>
                <td className="text-[var(--muted)] text-xs">{d.userId}</td>
                <td className="text-right">
                  {d.fromTag && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setRollbackTarget(d)}>
                      {t('deployments.rollback')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-[var(--faint)] text-xs">{t('deployments.noRecords')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deployments.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {rollbackTarget && t('deployments.rollbackConfirm', {
                to: rollbackTarget.toTag,
                from: rollbackTarget.fromTag,
              })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-[var(--destructive)]">{t('deployments.recreateWarning')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={confirmRollback}>{t('deployments.rollback')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
