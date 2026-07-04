import { useTranslation } from 'react-i18next';
import { Gauge } from './Gauge';
import { SystemOverview } from '../../types/system';
export function PerformanceCard({ o }: { o: SystemOverview }) {
  const { t } = useTranslation();
  const memPct = o.memTotalMb ? (o.memUsedMb / o.memTotalMb) * 100 : 0;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="text-[var(--heading)] font-bold text-sm mb-2">{t('dashboard.performance')} <span className="text-[10px] text-[var(--faint)] font-normal">· {t('dashboard.cpuAggregate')}</span></div>
      <div className="flex gap-3 justify-around">
        <Gauge value={o.cpuPercent} label={t('dashboard.cpu')} color="var(--accent)" sub={t('dashboard.cpuAggregate')} />
        <Gauge value={memPct} label={t('dashboard.ram')} color="var(--primary)" sub={`${(o.memUsedMb/1024).toFixed(1)} / ${(o.memTotalMb/1024).toFixed(0)} GB`} />
      </div>
    </div>
  );
}
