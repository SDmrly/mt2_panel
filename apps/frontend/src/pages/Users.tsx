// apps/frontend/src/pages/Users.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { apiErrorText } from '../lib/apiError';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../store/auth';
import { PanelRole, PanelUser } from '../types/user';
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

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  pending: 'warning',
  disabled: 'destructive',
};
const ROLE_VARIANT: Record<PanelRole, 'default' | 'outline' | 'secondary'> = {
  admin: 'default',
  operator: 'outline',
  viewer: 'secondary',
};
const ROLES: PanelRole[] = ['viewer', 'operator', 'admin'];
const selectClass =
  'bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius)] px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export default function Users() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useUsers();
  const myId = useAuthStore((s) => s.user?.id);
  const [approveTarget, setApproveTarget] = useState<PanelUser | null>(null);
  const [approveRole, setApproveRole] = useState<PanelRole>('viewer');
  const [deleteTarget, setDeleteTarget] = useState<PanelUser | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) return <p className="p-6 text-[var(--muted)]">{t('common.loading')}</p>;

  const patch = async (u: PanelUser, body: Record<string, unknown>, successMsg: string) => {
    try {
      await apiClient.patch(`/users/${u.id}`, body);
      toast.success(successMsg);
      refetch();
    } catch (err: any) {
      toast.error(apiErrorText(err, t));
    }
  };

  const openApprove = (u: PanelUser) => { setApproveRole('viewer'); setApproveTarget(u); };
  const confirmApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try {
      await apiClient.patch(`/users/${approveTarget.id}`, { status: 'active', role: approveRole });
      toast.success(t('users.approved', { username: approveTarget.username }));
      setApproveTarget(null);
      refetch();
    } catch (err: any) {
      toast.error(apiErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await apiClient.delete(`/users/${target.id}`);
      toast.success(t('users.deleted', { username: target.username }));
      refetch();
    } catch (err: any) {
      toast.error(apiErrorText(err, t));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">{t('users.title')}</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] text-xs">
              <th className="py-1.5 font-medium">{t('users.username')}</th>
              <th className="font-medium">{t('users.email')}</th>
              <th className="font-medium">{t('users.status')}</th>
              <th className="font-medium">{t('users.role')}</th>
              <th className="font-medium">{t('users.lastLogin')}</th>
              <th className="font-medium text-right">{t('users.action')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => {
              const self = u.id === myId;
              return (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 text-[var(--foreground)]">{u.username}</td>
                  <td className="text-[var(--muted)] text-xs">{u.email ?? '—'}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[u.status] ?? 'outline'}>{u.status}</Badge>
                  </td>
                  <td>
                    {u.status === 'active' && !self ? (
                      <select
                        className={selectClass}
                        value={u.role}
                        onChange={(e) => patch(u, { role: e.target.value }, t('users.roleUpdated', { username: u.username }))}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    )}
                  </td>
                  <td className="text-[var(--muted)] text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                  </td>
                  <td className="text-right space-x-2">
                    {u.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => openApprove(u)}>{t('users.approve')}</Button>
                    )}
                    {u.status === 'active' && !self && (
                      <Button size="sm" variant="outline" onClick={() => patch(u, { status: 'disabled' }, t('users.disabled', { username: u.username }))}>
                        {t('users.disable')}
                      </Button>
                    )}
                    {u.status === 'disabled' && (
                      <Button size="sm" variant="outline" onClick={() => patch(u, { status: 'active' }, t('users.enabled', { username: u.username }))}>
                        {t('users.enable')}
                      </Button>
                    )}
                    {!self && (
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>{t('users.delete')}</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-[var(--faint)] text-xs">{t('users.noUsers')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('users.approveDescription', { username: approveTarget?.username ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <select
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={approveRole}
            onChange={(e) => setApproveRole(e.target.value as PanelRole)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setApproveTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="default" disabled={busy} onClick={confirmApprove}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('users.deleteConfirm', { username: deleteTarget?.username ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={confirmDelete}>{t('users.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
