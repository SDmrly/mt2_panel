// apps/frontend/src/pages/Deployments.tsx
import { useState } from 'react';
import { apiClient } from '../lib/api';
import { useDeployments } from '../hooks/useDeployments';
import { Deployment } from '../types/deploy';

const STATUS_COLOR: Record<string, string> = {
  success: 'text-green-600', failed: 'text-red-600', rolled_back: 'text-yellow-600', running: 'text-blue-600',
};

export default function Deployments() {
  const { data, isLoading } = useDeployments();
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <p className="p-6">Yükleniyor…</p>;

  const rollback = async (d: Deployment) => {
    if (!d.fromTag) return;
    if (!confirm(`${d.toTag} → ${d.fromTag} geri alınsın mı?`)) return;
    setBusy(true);
    try { await apiClient.post('/deploy', { tag: d.fromTag }); } finally { setBusy(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Deployment Geçmişi</h1>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">
          <th className="py-1">Tarih</th><th>Değişim</th><th>Durum</th><th>Hata</th><th></th>
        </tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id} className="border-b">
              <td className="py-1">{new Date(d.startedAt).toLocaleString()}</td>
              <td className="font-mono">{d.fromTag ?? '—'} → {d.toTag}</td>
              <td className={STATUS_COLOR[d.status]}>{d.status}</td>
              <td className="text-red-500 text-xs max-w-xs truncate">{d.error ?? ''}</td>
              <td>{d.fromTag && (
                <button className="px-2 py-1 border rounded text-xs disabled:opacity-50"
                  disabled={busy} onClick={() => rollback(d)}>bu tag'e dön</button>
              )}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
