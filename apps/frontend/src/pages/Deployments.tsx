// apps/frontend/src/pages/Deployments.tsx
import { useState } from 'react';
import { apiClient } from '../lib/api';
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
  const { data, isLoading, refetch } = useDeployments();
  const [busy, setBusy] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);

  if (isLoading || !data) return <p className="p-6 text-[var(--muted)]">Yükleniyor…</p>;

  const confirmRollback = async () => {
    const target = rollbackTarget;
    if (!target?.fromTag) return;
    setRollbackTarget(null);
    setBusy(true);
    try {
      await apiClient.post('/deploy', { kind: target.kind, tag: target.fromTag });
      toast.success(`${target.toTag} → ${target.fromTag} geri alma başlatıldı`);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Geri alma başlatılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">Deployment Geçmişi</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] text-xs">
              <th className="py-1.5 font-medium">Tarih</th>
              <th className="font-medium">Değişim</th>
              <th className="font-medium">Tür</th>
              <th className="font-medium">Durum</th>
              <th className="font-medium">Kullanıcı</th>
              <th className="font-medium text-right">İşlem</th>
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
                      Geri Al
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-[var(--faint)] text-xs">Kayıt yok</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback onayı</DialogTitle>
            <DialogDescription>
              {rollbackTarget && (
                <>
                  <span className="font-mono">{rollbackTarget.toTag}</span> →{' '}
                  <span className="font-mono">{rollbackTarget.fromTag}</span> geri alınsın mı?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-[var(--destructive)]">İlgili servisler yeniden başlatılacak (recreate).</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>İptal</Button>
            <Button variant="destructive" onClick={confirmRollback}>Geri Al</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
