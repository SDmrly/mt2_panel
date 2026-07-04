// apps/frontend/src/components/ServiceCard.tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ServiceCard as TCard } from '../types/service';
import { Badge } from './ui/badge';
import { healthDisplay } from '../lib/serviceHealth';

const ROLE_ICON: Record<string, string> = {
  database: '🗄️', 'db-process': '🧩', auth: '🔑', channel: '🎮', proxy: '🚪', 'quest-compiler': '🛠️',
};
const STATUS_DOT: Record<string, string> = {
  running: 'var(--accent)', restarting: 'var(--warning)', exited: 'var(--faint)', stopped: 'var(--faint)',
};

export function ServiceCard({ service: s }: { service: TCard }) {
  const { t } = useTranslation();
  const dotColor = STATUS_DOT[s.status] ?? 'var(--faint)';
  const health = healthDisplay(s.health, s.status);
  const memPercent = s.stats ? (s.stats.memUsedMb / s.stats.memLimitMb) * 100 : undefined;

  return (
    <Link
      to={`/services/${s.name}`}
      className="block bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} title={s.status} />
          <span aria-hidden="true">{ROLE_ICON[s.role]}</span>
          <span className="font-mono text-sm font-semibold text-[var(--heading)] truncate">{s.name}</span>
        </div>
        <Badge variant={health.variant}>{t(`services.health.${health.label}`, { defaultValue: health.label })}</Badge>
      </div>

      <div className="mb-2">
        <Badge variant="outline" className="font-normal text-[var(--muted)]">
          {s.role}{s.role === 'channel' && s.channel !== undefined ? ` · ch${s.channel}` : ''}
        </Badge>
      </div>

      <div className="text-xs text-[var(--faint)] mb-2 truncate">
        {s.image.name}:{s.image.tag} · {s.uptime}
      </div>

      {s.stats && (
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[var(--muted)]">
            {t('dashboard.cpu')}<span className="text-[var(--foreground)]">{s.stats.cpuPercent}%</span>
          </div>
          <div className="h-1 bg-[var(--border)] rounded">
            <div className="h-1 rounded" style={{ width: `${Math.min(100, s.stats.cpuPercent)}%`, background: 'var(--accent)' }} />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--muted)]">
            {t('dashboard.ram')}<span className="text-[var(--foreground)]">{Math.round(memPercent ?? 0)}%</span>
          </div>
          <div className="h-1 bg-[var(--border)] rounded">
            <div className="h-1 rounded" style={{ width: `${Math.min(100, memPercent ?? 0)}%`, background: 'var(--primary)' }} />
          </div>
        </div>
      )}

      {s.role === 'quest-compiler' && s.exitCode !== undefined && (
        <div className={s.exitCode === 0 ? 'text-[var(--accent)] text-xs mt-2' : 'text-[var(--destructive)] text-xs font-bold mt-2'}>
          {t('services.exit')} {s.exitCode}
        </div>
      )}
    </Link>
  );
}
