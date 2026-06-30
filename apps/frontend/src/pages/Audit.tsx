// apps/frontend/src/pages/Audit.tsx
import { useState } from 'react';
import { useAudit } from '../hooks/useAudit';
import { AuditAction } from '../types/audit';

const ACTIONS: (AuditAction | '')[] = ['', 'login', 'login_failed', 'logout', 'service_restart', 'service_stop', 'deploy', 'rollback'];

export default function Audit() {
  const [action, setAction] = useState('');
  const [username, setUsername] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data, isLoading } = useAudit({
    action: action || undefined,
    username: username || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    offset,
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Audit Log</h1>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <select className="border p-2 rounded" value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a || 'tüm eylemler'}</option>)}
        </select>
        <input className="border p-2 rounded" placeholder="kullanıcı adı" value={username} onChange={(e) => { setUsername(e.target.value); setOffset(0); }} />
        <input type="date" className="border p-2 rounded" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} title="Başlangıç tarihi" />
        <input type="date" className="border p-2 rounded" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} title="Bitiş tarihi" />
      </div>
      {isLoading || !data ? <p>Yükleniyor…</p> : (
        <>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="py-1">Tarih</th><th>Kullanıcı</th><th>Eylem</th><th>Hedef</th><th>Sonuç</th><th>IP</th>
            </tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-1">{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.username ?? '—'}</td>
                  <td>{r.action}</td>
                  <td className="font-mono">{r.target ?? '—'}</td>
                  <td className={r.result === 'success' ? 'text-green-600' : 'text-red-600'}>{r.result}</td>
                  <td className="text-gray-500">{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 text-sm">
            <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>‹ Önceki</button>
            <span>{data.total === 0 ? '0 / 0' : `${offset + 1}–${Math.min(offset + limit, data.total)} / ${data.total}`}</span>
            <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)}>Sonraki ›</button>
          </div>
        </>
      )}
    </div>
  );
}
