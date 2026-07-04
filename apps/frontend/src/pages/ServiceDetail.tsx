// apps/frontend/src/pages/ServiceDetail.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'lucide-react';
import { apiClient } from '../lib/api';
import { apiErrorText } from '../lib/apiError';
import { useServices } from '../hooks/useServices';
import { useServiceStats } from '../hooks/useServiceStats';
import { useAuthStore } from '../store/auth';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Gauge } from '../components/dashboard/Gauge';
import { NetworkCard } from '../components/dashboard/NetworkCard';
import { LogModal } from '../components/logs/LogModal';
import { healthDisplay } from '../lib/serviceHealth';
import { toast } from 'sonner';

const STATUS_DOT: Record<string, string> = {
  running: 'var(--accent)', restarting: 'var(--warning)', exited: 'var(--faint)', stopped: 'var(--faint)',
};

export default function ServiceDetail() {
  const { t } = useTranslation();
  const { name = '' } = useParams();
  const { data: services } = useServices();
  const { data: stats } = useServiceStats(name);
  const [netRate, setNetRate] = useState<{ rx: number; tx: number }>({ rx: 0, tx: 0 });
  const [netHistory, setNetHistory] = useState<{ t: number; rx: number; tx: number }[]>([]);
  const prevNet = useRef<{ rx: number; tx: number; at: number } | null>(null);
  const [modal, setModal] = useState<null | 'restart' | 'stop'>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'operator';
  const card = services?.find((s) => s.name === name);
  const memPct = stats && stats.memLimitMb ? (stats.memUsedMb / stats.memLimitMb) * 100 : 0;

  // Kümülatif net toplamından anlık MB/s oranını hesapla (Dashboard ile aynı semantik).
  useEffect(() => {
    if (!stats) return;
    const now = Date.now();
    const cumRx = stats.networkRxMb;
    const cumTx = stats.networkTxMb;
    const prev = prevNet.current;
    if (prev && now > prev.at) {
      const dt = (now - prev.at) / 1000;
      const rx = Math.max(0, Number(((cumRx - prev.rx) / dt).toFixed(2)));
      const tx = Math.max(0, Number(((cumTx - prev.tx) / dt).toFixed(2)));
      setNetRate({ rx, tx });
      setNetHistory((h) => [...h, { t: now, rx, tx }].slice(-30));
    }
    prevNet.current = { rx: cumRx, tx: cumTx, at: now };
  }, [stats]);

  // Servis değişince net geçmişini sıfırla.
  useEffect(() => {
    prevNet.current = null;
    setNetHistory([]);
    setNetRate({ rx: 0, tx: 0 });
  }, [name]);

  const act = async (a: 'restart' | 'stop') => {
    setModal(null);
    setBusy(true);
    try {
      await apiClient.post(`/services/${name}/${a}`);
      toast.success(t(a === 'restart' ? 'services.restarted' : 'services.stopped', { name }));
    } catch (err: any) {
      toast.error(apiErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Başlık + aksiyonlar (restart/stop artık burada, panelin altında değil) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: card ? STATUS_DOT[card.status] ?? 'var(--faint)' : 'var(--faint)' }}
          />
          <h1 className="text-xl font-bold font-mono text-[var(--heading)]">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setModal('restart')}>{t('services.restart')}</Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => setModal('stop')}>{t('services.stop')}</Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setLogsOpen(true)}>
            <Terminal size={14} /> {t('services.liveLog')}
          </Button>
        </div>
      </div>

      {card && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">
            {card.role}{card.role === 'channel' && card.channel !== undefined ? ` · ch${card.channel}` : ''}
          </Badge>
          {(() => { const h = healthDisplay(card.health, card.status); return <Badge variant={h.variant}>{t(`services.health.${h.label}`, { defaultValue: h.label })}</Badge>; })()}
          <span className="text-xs text-[var(--faint)]">{card.image.name}:{card.image.tag} · {card.uptime}</span>
        </div>
      )}

      {/* Performans (CPU/RAM gauge — Dashboard ile aynı) + Ağ trafiği grafiği */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[var(--heading)] font-bold text-sm mb-2">{t('services.performance')}</div>
          <div className="flex gap-3 justify-around">
            <Gauge value={stats?.cpuPercent ?? 0} label={t('dashboard.cpu')} color="var(--accent)" />
            <Gauge
              value={memPct}
              label={t('dashboard.ram')}
              color="var(--primary)"
              sub={stats ? `${stats.memUsedMb} / ${stats.memLimitMb} MB` : undefined}
            />
          </div>
        </div>
        <NetworkCard rx={netRate.rx} tx={netRate.tx} history={netHistory} />
      </div>

      <div className="text-sm text-[var(--muted)]">
        {t('services.ports')}: <span className="font-mono text-[var(--foreground)]">{card?.ports.join(', ') || '—'}</span>
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === 'restart' ? t('services.restartTitle') : t('services.stopTitle')}</DialogTitle>
            <DialogDescription>
              {modal === 'restart' ? t('services.restartConfirm', { name }) : t('services.stopConfirm', { name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={busy} onClick={() => modal && act(modal)}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogModal service={logsOpen ? name : null} onClose={() => setLogsOpen(false)} />
    </div>
  );
}
