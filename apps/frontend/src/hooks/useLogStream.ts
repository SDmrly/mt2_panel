// apps/frontend/src/hooks/useLogStream.ts
import { useEffect, useState, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '../store/auth';
import { LogMessage } from '../types/log';

const MAX_LINES = 2000;
type Status = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error';

export function useLogStream(name: string | null) {
  const [lines, setLines] = useState<LogMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    if (!name) { setStatus('idle'); return; }
    const ctrl = new AbortController();
    setLines([]); setStatus('connecting');
    const base = import.meta.env.VITE_API_URL ?? '';
    const token = useAuthStore.getState().accessToken;

    fetchEventSource(`${base}/logs/${name}/stream`, {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}` },
      openWhenHidden: true,
      onopen: async (res) => {
        const ct = res.headers.get('content-type') ?? '';
        if (res.ok && ct.includes('text/event-stream')) setStatus('open');
        else if (res.status === 401) { setStatus('error'); useAuthStore.getState().clear(); ctrl.abort(); }
        else {
          // 200 ama SSE değil (örn. yanlış URL → SPA fallback HTML): sessizce "open" kalma, hata ver
          setStatus('error'); ctrl.abort();
        }
      },
      onmessage: (ev) => {
        if (!ev.data) return;
        try {
          const parsed = JSON.parse(ev.data);
          const batch: LogMessage[] = Array.isArray(parsed) ? parsed : [parsed];
          setLines((prev) => [...prev, ...batch].slice(-MAX_LINES));
        } catch { /* yarım event yoksay */ }
      },
      onerror: () => { setStatus('reconnecting'); /* throw etmeyerek otomatik retry */ },
    }).catch(() => setStatus('error'));

    return () => ctrl.abort();
  }, [name]);

  return { lines, status, clear };
}
