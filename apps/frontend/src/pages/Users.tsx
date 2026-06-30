// apps/frontend/src/pages/Users.tsx
import { useState } from 'react';
import { apiClient } from '../lib/api';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../store/auth';
import { PanelRole, PanelUser } from '../types/user';

const STATUS_COLOR: Record<string, string> = { active: 'text-green-600', pending: 'text-yellow-600', disabled: 'text-red-600' };
const ROLES: PanelRole[] = ['viewer', 'operator', 'admin'];

export default function Users() {
  const { data, isLoading, refetch } = useUsers();
  const myId = useAuthStore((s) => s.user?.id);
  const [approveTarget, setApproveTarget] = useState<PanelUser | null>(null);
  const [approveRole, setApproveRole] = useState<PanelRole>('viewer');
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <p className="p-6">Yükleniyor…</p>;

  const patch = async (id: string, body: Record<string, unknown>) => { await apiClient.patch(`/users/${id}`, body); refetch(); };
  const openApprove = (u: PanelUser) => { setApproveRole('viewer'); setApproveTarget(u); };
  const confirmApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try { await patch(approveTarget.id, { status: 'active', role: approveRole }); setApproveTarget(null); }
    finally { setBusy(false); }
  };
  const remove = async (u: PanelUser) => { if (confirm(`${u.username} silinsin mi?`)) { await apiClient.delete(`/users/${u.id}`); refetch(); } };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Kullanıcılar</h1>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">
          <th className="py-1">Kullanıcı</th><th>E-posta</th><th>Durum</th><th>Rol</th><th>Son giriş</th><th>İşlem</th>
        </tr></thead>
        <tbody>
          {data.map((u) => {
            const self = u.id === myId;
            return (
              <tr key={u.id} className="border-b">
                <td className="py-1">{u.username}</td>
                <td>{u.email ?? '—'}</td>
                <td className={STATUS_COLOR[u.status]}>{u.status}</td>
                <td>
                  {u.status === 'active' && !self ? (
                    <select className="border rounded p-1 text-xs" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : u.role}
                </td>
                <td className="text-gray-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
                <td className="space-x-2">
                  {u.status === 'pending' && <button className="px-2 py-1 border rounded text-xs" onClick={() => openApprove(u)}>Onayla</button>}
                  {u.status === 'active' && !self && <button className="px-2 py-1 border rounded text-xs" onClick={() => patch(u.id, { status: 'disabled' })}>Devre dışı</button>}
                  {u.status === 'disabled' && <button className="px-2 py-1 border rounded text-xs" onClick={() => patch(u.id, { status: 'active' })}>Etkinleştir</button>}
                  {!self && <button className="px-2 py-1 border rounded text-xs text-red-600" onClick={() => remove(u)}>Sil</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {approveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 space-y-4 w-80 shadow-lg">
            <h2 className="font-semibold">Kullanıcıyı onayla</h2>
            <p className="text-sm text-gray-600">
              <span className="font-mono">{approveTarget.username}</span> için rol seçin:
            </p>
            <select
              className="w-full border rounded p-2 text-sm"
              value={approveRole}
              onChange={(e) => setApproveRole(e.target.value as PanelRole)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded text-sm" disabled={busy} onClick={() => setApproveTarget(null)}>İptal</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50" disabled={busy} onClick={confirmApprove}>Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
