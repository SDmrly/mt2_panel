import { useTranslation } from 'react-i18next';
import { SystemOverview } from '../../types/system';
import { Badge } from '../ui/badge';
export function DiskCard({ o }: { o: SystemOverview }) {
  const { t } = useTranslation();
  const hasTotal = o.diskTotalGb > 0;
  const pct = hasTotal ? Math.min(100, (o.diskUsedGb / o.diskTotalGb) * 100) : 0;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[var(--heading)] font-bold text-sm">{t('dashboard.disk')}</span>
        <Badge variant="success" className="text-[10px]">{t('dashboard.healthy')}</Badge>
      </div>
      <div className="text-[var(--muted)] text-xs mb-2">
        {hasTotal ? <>{t('dashboard.used')}: <span className="text-[var(--heading)]">{o.diskUsedGb} GB</span> · {t('dashboard.total')}: <span className="text-[var(--heading)]">{o.diskTotalGb} GB</span></>
                  : <>{t('dashboard.dockerDiskUsage')}: <span className="text-[var(--heading)]">{o.diskUsedGb} GB</span></>}
      </div>
      {hasTotal && <div className="h-2 bg-[var(--border)] rounded overflow-hidden"><div className="h-2 bg-[var(--primary)] rounded" style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}
