// apps/frontend/src/pages/Deploy.tsx
import { useState } from 'react';
import { apiClient } from '../lib/api';
import { useDeployTags } from '../hooks/useDeployTags';
import { useDeployStream } from '../hooks/useDeployStream';

export default function Deploy() {
  const { data } = useDeployTags();
  const [target, setTarget] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { events, status } = useDeployStream(jobId);
  const current = data?.current ?? '—';

  const doDeploy = async () => {
    setConfirming(false);
    const { data: res } = await apiClient.post<{ jobId: string }>('/deploy', { tag: target });
    setJobId(res.jobId);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Deploy</h1>
      <div className="text-sm">Çalışan tag: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{current}</span></div>
      <div className="flex items-center gap-2">
        <select className="border p-2 rounded" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Tag seç…</option>
          {data?.tags.map((t) => (
            <option key={t.name} value={t.name} disabled={!t.deployable}>
              {t.name}{!t.deployable ? ' (db image yok)' : ''}
            </option>
          ))}
        </select>
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={!target || status === 'open'} onClick={() => setConfirming(true)}>Deploy</button>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 space-y-3 max-w-md">
            <p><b>{current} → {target}</b> deploy edilsin mi?</p>
            <p className="text-xs text-red-600">Tüm game servisleri + quest-compiler recreate olur (yeniden başlar).</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirming(false)}>İptal</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={doDeploy}>Onayla</button>
            </div>
          </div>
        </div>
      )}

      {jobId && (
        <div className="border rounded bg-black text-green-300 font-mono text-xs p-3 h-80 overflow-auto">
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
