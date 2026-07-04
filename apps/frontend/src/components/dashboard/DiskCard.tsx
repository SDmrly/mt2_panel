import { SystemOverview } from '../../types/system';
export function DiskCard({ o }: { o: SystemOverview }) {
  const hasTotal = o.diskTotalGb > 0;
  const pct = hasTotal ? Math.min(100, (o.diskUsedGb / o.diskTotalGb) * 100) : 0;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[var(--heading)] font-bold text-sm">Disk</span>
        <span className="text-[10px] px-2 py-0.5 rounded border border-[#134e3a] text-[var(--accent)] bg-[#06281f]">Healthy</span>
      </div>
      <div className="text-[var(--muted)] text-xs mb-2">
        {hasTotal ? <>Kullanılan: <span className="text-[var(--heading)]">{o.diskUsedGb} GB</span> · Toplam: <span className="text-[var(--heading)]">{o.diskTotalGb} GB</span></>
                  : <>Docker disk kullanımı: <span className="text-[var(--heading)]">{o.diskUsedGb} GB</span></>}
      </div>
      {hasTotal && <div className="h-2 bg-[var(--border)] rounded overflow-hidden"><div className="h-2 bg-[var(--primary)] rounded" style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}
