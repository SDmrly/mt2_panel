// apps/frontend/src/pages/Deploy.tsx
import { useState } from 'react';
import { apiClient } from '../lib/api';
import { useDeployTags } from '../hooks/useDeployTags';
import { useDeployStream } from '../hooks/useDeployStream';
import { timeAgo } from '../lib/timeAgo';
import { DeployKind, TagInfo } from '../types/deploy';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';

interface ConfirmTarget { kind: DeployKind; tag: TagInfo; }

function ImageTable({
  kind,
  title,
  items,
  current,
  onDeploy,
  onDelete,
}: {
  kind: DeployKind;
  title: string;
  items: TagInfo[];
  current: string | null;
  onDeploy: (kind: DeployKind, tag: TagInfo) => void;
  onDelete: (kind: DeployKind, tag: TagInfo) => void;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[var(--heading)] font-bold text-sm">{title}</span>
        <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] font-mono">
          çalışan: {current ?? '—'}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] text-xs">
            <th className="py-1.5 font-medium">Tag</th>
            <th className="font-medium">Oluşturulma</th>
            <th className="font-medium">Boyut</th>
            <th className="font-medium text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.name} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: t.isRunning ? 'var(--accent)' : 'var(--faint)' }}
                  />
                  <span className="font-mono text-[var(--foreground)]">{t.name}</span>
                  {t.isRunning && <Badge variant="success">çalışıyor</Badge>}
                </div>
              </td>
              <td className="text-[var(--muted)] text-xs">
                <div>{new Date(t.createdAt).toLocaleString()}</div>
                <div className="text-[var(--faint)]">{timeAgo(t.createdAt)}</div>
              </td>
              <td className="text-[var(--muted)] text-xs">{t.sizeMb} MB</td>
              <td className="text-right space-x-2">
                <Button size="sm" variant="destructive" disabled={t.isRunning} onClick={() => onDelete(kind, t)}>
                  Sil
                </Button>
                <Button size="sm" variant="default" disabled={t.isRunning || !t.deployable} onClick={() => onDeploy(kind, t)}>
                  Deploy
                </Button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-[var(--faint)] text-xs">
                Image yok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Deploy() {
  const { data, refetch } = useDeployTags();
  const [jobId, setJobId] = useState<string | null>(null);
  const [deployTarget, setDeployTarget] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfirmTarget | null>(null);
  const { events, status } = useDeployStream(jobId);

  const currentFor = (kind: DeployKind) => (kind === 'game' ? data?.currentGame : data?.currentDb) ?? null;

  const confirmDeploy = async () => {
    if (!deployTarget) return;
    const { kind, tag } = deployTarget;
    setDeployTarget(null);
    try {
      const { data: res } = await apiClient.post<{ jobId: string }>('/deploy', { kind, tag: tag.name });
      setJobId(res.jobId);
      toast.success(`${tag.name} deploy başlatıldı`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Deploy başlatılamadı');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, tag } = deleteTarget;
    setDeleteTarget(null);
    try {
      await apiClient.delete(`/deploy/images/${kind}/${tag.name}`);
      toast.success('Image silindi');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Silme başarısız');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">Deploy</h1>

      <ImageTable
        kind="game"
        title="Game Images"
        items={data?.game ?? []}
        current={data?.currentGame ?? null}
        onDeploy={(kind, tag) => setDeployTarget({ kind, tag })}
        onDelete={(kind, tag) => setDeleteTarget({ kind, tag })}
      />
      <ImageTable
        kind="db"
        title="DB Images"
        items={data?.db ?? []}
        current={data?.currentDb ?? null}
        onDeploy={(kind, tag) => setDeployTarget({ kind, tag })}
        onDelete={(kind, tag) => setDeleteTarget({ kind, tag })}
      />

      <Dialog open={!!deployTarget} onOpenChange={(open) => !open && setDeployTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy onayı</DialogTitle>
            <DialogDescription>
              {deployTarget && (
                <>
                  <span className="font-mono">{currentFor(deployTarget.kind) ?? '—'}</span> →{' '}
                  <span className="font-mono">{deployTarget.tag.name}</span> ({deployTarget.kind}) deploy edilsin mi?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-[var(--destructive)]">İlgili servisler yeniden başlatılacak (recreate).</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployTarget(null)}>İptal</Button>
            <Button variant="default" onClick={confirmDeploy}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image sil</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-mono">{deleteTarget.tag.name}</span> ({deleteTarget.kind}) silinsin mi?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {jobId && (
        <div className="border border-[var(--border)] rounded-xl bg-black text-green-300 font-mono text-xs p-3 h-80 overflow-auto">
          <div>durum: {status}</div>
          {events.map((e, i) => (
            <div key={i} className={e.type === 'failed' ? 'text-red-400' : e.type === 'rollback' ? 'text-yellow-300' : ''}>
              {e.type === 'log' ? e.line : `[${e.type}${e.step ? ' ' + e.step : ''}${e.status ? ':' + e.status : ''}]${e.error ? ' ' + e.error : ''}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
