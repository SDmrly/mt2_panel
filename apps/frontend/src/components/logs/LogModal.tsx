// apps/frontend/src/components/logs/LogModal.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize2, X } from 'lucide-react';
import { useLogStream } from '../../hooks/useLogStream';
import { levelColor } from '../../lib/logLevel';
import { LogLevel } from '../../types/log';

const LEVELS: (LogLevel | 'all')[] = ['all', 'error', 'warning'];

export function LogModal({ service, onClose }: { service: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  // Hook her zaman çağrılır (React hook kuralı); null service için useLogStream zaten
  // güvenli (idle kalır, stream açmaz).
  const { lines, status } = useLogStream(service);
  const bodyRef = useRef<HTMLDivElement>(null);
  const view = filter === 'all' ? lines : lines.filter((l) => l.level === filter);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [view.length]);

  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-[78%] max-w-[700px] bg-[#0a0f1a] border border-[var(--border-hover)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0d1424] border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            </div>
            <span className="font-mono text-xs font-semibold text-[var(--foreground)]">{service}</span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {status === 'open' ? t('logs.live') : status}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`text-[9px] px-2 py-1 rounded ${filter === l ? 'bg-[var(--active)] text-[var(--primary)]' : 'text-[var(--faint)]'}`}
              >
                {l}
              </button>
            ))}
            <button
              title={t('logs.fullscreen')}
              onClick={() => {
                onClose();
                nav(`/logs?service=${service}`);
              }}
              className="text-[var(--muted)] hover:text-[var(--primary)] px-1"
            >
              <Maximize2 size={14} />
            </button>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--destructive)] px-1">
              <X size={15} />
            </button>
          </div>
        </div>
        <div ref={bodyRef} className="bg-[#060b14] px-3.5 py-3 font-mono text-[11px] leading-relaxed h-[340px] overflow-auto">
          {view.map((l, i) => (
            <div key={i} className={levelColor(l.level)}>
              {l.timestamp ? `[${l.timestamp}] ` : ''}
              {l.message || l.raw}
            </div>
          ))}
        </div>
        <div className="px-3.5 py-1.5 bg-[#0d1424] border-t border-[var(--border)] text-[9px] text-[var(--faint)]">
          {t('logs.autoscrollRecent')}
        </div>
      </div>
    </div>
  );
}
