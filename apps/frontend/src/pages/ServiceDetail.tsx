// apps/frontend/src/pages/ServiceDetail.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../lib/api';
import { useServices } from '../hooks/useServices';
import { useServiceStats } from '../hooks/useServiceStats';
import { useAuthStore } from '../store/auth';
import { ConfirmModal } from '../components/ConfirmModal';

export default function ServiceDetail() {
  const { name = '' } = useParams();
  const { data: services } = useServices();
  const { data: stats } = useServiceStats(name);
  const [history, setHistory] = useState<
    { t: string; cpu: number; mem: number }[]
  >([]);
  const [modal, setModal] = useState<null | 'restart' | 'stop'>(null);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'operator';
  const card = services?.find((s) => s.name === name);

  // Accumulate stats history in a useEffect to avoid triggering infinite render loops
  useEffect(() => {
    if (!stats) return;
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      // Skip if the CPU value hasn't changed (avoid duplicate points)
      if (last && last.cpu === stats.cpuPercent) return prev;
      return [
        ...prev,
        {
          t: new Date().toLocaleTimeString(),
          cpu: stats.cpuPercent,
          mem: stats.memUsedMb,
        },
      ].slice(-30);
    });
  }, [stats]);

  const act = async (a: 'restart' | 'stop') => {
    await apiClient.post(`/services/${name}/${a}`);
    setModal(null);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">{name}</h1>
      {card && (
        <div className="text-sm text-gray-500">
          {card.role} · {card.image.name}:{card.image.tag} · {card.health}
        </div>
      )}
      <div className="h-64 border rounded p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="t" hide />
            <YAxis />
            <Tooltip />
            <Line dataKey="cpu" name="CPU %" stroke="#2563eb" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {stats && (
        <div className="text-sm">
          CPU {stats.cpuPercent}% · RAM {stats.memUsedMb}/{stats.memLimitMb} MB
          · net ↓{stats.networkRxMb} ↑{stats.networkTxMb} MB
        </div>
      )}
      <div className="text-sm">Portlar: {card?.ports.join(', ') || '—'}</div>
      {canWrite && (
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setModal('restart')}
          >
            Restart
          </button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setModal('stop')}
          >
            Stop
          </button>
        </div>
      )}
      <ConfirmModal
        open={modal !== null}
        title={modal ? `${name} ${modal} edilsin mi?` : ''}
        onConfirm={() => act(modal!)}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
