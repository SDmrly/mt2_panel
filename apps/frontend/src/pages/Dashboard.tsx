// apps/frontend/src/pages/Dashboard.tsx
import { useEffect, useRef, useState } from 'react';
import { useSystemOverview } from '../hooks/useSystemOverview';
import { PerformanceCard } from '../components/dashboard/PerformanceCard';
import { DiskCard } from '../components/dashboard/DiskCard';
import { NetworkCard } from '../components/dashboard/NetworkCard';
import { ContainerTiles } from '../components/dashboard/ContainerTiles';
import { LogModal } from '../components/logs/LogModal';

export default function Dashboard() {
  const { data: o, isLoading } = useSystemOverview();
  const [logService, setLogService] = useState<string | null>(null);
  const histRef = useRef<{ t: number; rx: number; tx: number }[]>([]);
  useEffect(() => {
    if (o) { histRef.current = [...histRef.current, { t: Date.now(), rx: o.netRxMbps, tx: o.netTxMbps }].slice(-30); }
  }, [o]);

  if (isLoading || !o) return <p className="p-6 text-[var(--muted)]">Yükleniyor…</p>;

  return (
    <div className="p-6 space-y-4">
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        <PerformanceCard o={o} />
        <DiskCard o={o} />
      </div>
      <NetworkCard rx={o.netRxMbps} tx={o.netTxMbps} history={histRef.current} />
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--heading)] font-bold text-sm">Containers</span>
          <span className="text-[var(--faint)] text-[10px]">kutuya tıkla → canlı log · servis detayı için soldaki menü</span>
        </div>
        <ContainerTiles items={o.containers} onLogs={setLogService} />
      </div>
      <LogModal service={logService} onClose={() => setLogService(null)} />
    </div>
  );
}
