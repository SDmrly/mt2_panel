// apps/frontend/src/hooks/useDeployStream.ts
import { useEffect, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '../store/auth';
import { DeployEvent } from '../types/deploy';

export function useDeployStream(jobId: string | null) {
  const [events, setEvents] = useState<DeployEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'open' | 'done' | 'error'>('idle');
  useEffect(() => {
    if (!jobId) { setStatus('idle'); setEvents([]); return; }
    const ctrl = new AbortController();
    setEvents([]); setStatus('open');
    const base = import.meta.env.VITE_API_URL ?? '';
    const token = useAuthStore.getState().accessToken;
    fetchEventSource(`${base}/deploy/jobs/${jobId}/stream`, {
      signal: ctrl.signal, headers: { Authorization: `Bearer ${token}` }, openWhenHidden: true,
      onopen: async (res) => {
        const ct = res.headers.get('content-type') ?? '';
        if (res.ok && ct.includes('text/event-stream')) setStatus('open');
        else { setStatus('error'); ctrl.abort(); }
      },
      onmessage: (ev) => {
        if (!ev.data) return;
        try {
          const e = JSON.parse(ev.data) as DeployEvent;
          setEvents((prev) => [...prev, e]);
          if (e.type === 'done') setStatus('done');
          if (e.type === 'failed') setStatus('error');
        } catch { /* yoksay */ }
      },
      onerror: () => { /* retry */ },
    }).catch(() => setStatus('error'));
    return () => ctrl.abort();
  }, [jobId]);
  return { events, status };
}
