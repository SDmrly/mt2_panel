import { Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContainerStat } from '../../types/system';
export function ContainerTiles({ items, onLogs }: { items: ContainerStat[]; onLogs: (name: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {items.map((c) => {
        const exited = c.status !== 'running';
        return (
          <div key={c.name} onClick={() => !exited && onLogs(c.name)}
            title={exited ? undefined : t('dashboard.liveLogTitle')}
            className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 ${exited ? 'opacity-70' : 'cursor-pointer hover:border-[var(--border-hover)]'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: exited ? 'var(--faint)' : 'var(--accent)' }} />
                <span className="text-[var(--heading)] text-[11px] font-semibold truncate">{c.name}</span>
              </div>
              {!exited && <button onClick={(e) => { e.stopPropagation(); onLogs(c.name); }} className="text-[var(--muted)] hover:text-[var(--primary)]" title={t('dashboard.liveLog')}><Terminal size={13} /></button>}
            </div>
            {exited ? <div className="text-[var(--faint)] text-[9px] mt-2">{t('dashboard.exited')}</div> : (
              <>
                <div className="flex justify-between text-[9px] text-[var(--muted)] mb-1">{t('dashboard.cpu')}<span className="text-[var(--foreground)]">{c.cpuPercent}%</span></div>
                <div className="h-1 bg-[var(--border)] rounded mb-1.5"><div className="h-1 rounded" style={{ width: `${Math.min(100, c.cpuPercent)}%`, background: 'var(--accent)' }} /></div>
                <div className="flex justify-between text-[9px] text-[var(--muted)] mb-1">{t('dashboard.ram')}<span className="text-[var(--foreground)]">{c.memPercent}%</span></div>
                <div className="h-1 bg-[var(--border)] rounded"><div className="h-1 rounded" style={{ width: `${Math.min(100, c.memPercent)}%`, background: 'var(--primary)' }} /></div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
