// apps/frontend/src/pages/Logs.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FixedSizeList } from 'react-window';

const ITEM_SIZE = 18;
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useLogStream } from '../hooks/useLogStream';
import { apiClient } from '../lib/api';
import { levelColor } from '../lib/logLevel';
import { LogLevel, LogMessage } from '../types/log';
import { cn } from '../lib/utils';

const LEVELS: (LogLevel | 'all')[] = ['all', 'error', 'warning', 'info'];

export default function Logs() {
  const { data: services } = useServices();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(() => params.get('service'));
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  // Auto-select first service when data is available and nothing explicitly selected
  const effectiveSelected = selected ?? services?.[0]?.name ?? null;

  const sel = services?.find((s) => s.name === effectiveSelected);
  const isQuest = sel?.role === 'quest-compiler';

  // quest-compiler: exited container → REST tail (follow yok)
  const questQuery = useQuery({
    queryKey: ['logs-tail', effectiveSelected],
    queryFn: async () => (await apiClient.get<LogMessage[]>(`/logs/${effectiveSelected}?tail=1000`)).data,
    enabled: !!effectiveSelected && isQuest,
  });
  // diğerleri: canlı stream
  const { lines: streamLines, status } = useLogStream(isQuest ? null : effectiveSelected);

  const lines = isQuest ? (questQuery.data ?? []) : streamLines;
  const view = useMemo(
    () => (filter === 'all' ? lines : lines.filter((l) => l.level === filter)),
    [lines, filter],
  );

  // Log paneli yüksekliğini dinamik ölç — liste tüm paneli doldursun (sabit yükseklik yok).
  const bodyRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setListHeight(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return; // jsdom/test ortamı
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-scroll: yeni satır gelince en alta kay — ama yalnızca kullanıcı zaten en alttaysa.
  const listRef = useRef<FixedSizeList | null>(null);
  const atBottomRef = useRef(true);
  useEffect(() => {
    if (atBottomRef.current && view.length > 0) {
      listRef.current?.scrollToItem(view.length - 1, 'end');
    }
  }, [view.length]);
  // Servis değişince en alta dön (yeni akışın başında).
  useEffect(() => {
    atBottomRef.current = true;
  }, [effectiveSelected]);
  const handleScroll = ({
    scrollOffset,
    scrollUpdateWasRequested,
  }: {
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => {
    if (scrollUpdateWasRequested) return; // programatik kaydırmayı yoksay
    const totalHeight = view.length * ITEM_SIZE;
    // son ~2 satır içindeyse "en altta" say
    atBottomRef.current = scrollOffset + listHeight >= totalHeight - ITEM_SIZE * 2;
  };

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-4rem)]">
      <aside className="w-56 shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-xl p-2 space-y-1 overflow-y-auto">
        <h2 className="text-[10px] tracking-wide text-[var(--faint)] px-2 pt-1 pb-2">SERVİSLER</h2>
        {services?.map((s) => (
          <button
            key={s.name}
            onClick={() => setSelected(s.name)}
            className={cn(
              'block w-full text-left px-2 py-1.5 rounded-lg text-sm font-mono transition-colors',
              effectiveSelected === s.name
                ? 'bg-[#15233d] text-[var(--primary)] font-semibold'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#0f1a2e]',
            )}
          >
            {s.name}
          </button>
        ))}
      </aside>
      <section className="flex-1 flex flex-col min-w-0 bg-[#0a0f1a] border border-[#243049] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#0d1424] border-b border-[var(--border)]">
          <div className="flex gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
          </div>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={cn(
                'text-[10px] px-2 py-1 rounded font-mono',
                filter === l ? 'bg-[#15233d] text-[var(--primary)]' : 'text-[var(--faint)] hover:text-[var(--muted)]',
              )}
            >
              {l}
            </button>
          ))}
          {!isQuest && effectiveSelected && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--accent)] ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {status === 'open' ? 'canlı' : status}
            </span>
          )}
          {isQuest && <span className="text-[10px] text-[var(--faint)] ml-auto">init container (tail)</span>}
        </div>
        <div ref={bodyRef} className="flex-1 bg-[#060b14] font-mono text-xs min-h-0">
          {!services?.length && <p className="p-4 text-[var(--muted)]">Servis bulunamadı.</p>}
          {effectiveSelected && (
            <FixedSizeList ref={listRef} height={listHeight || 600} width="100%" itemCount={view.length} itemSize={ITEM_SIZE} onScroll={handleScroll}>
              {({ index, style }: { index: number; style: CSSProperties }) => {
                const l = view[index];
                return (
                  <div style={style} className={`px-3.5 whitespace-pre overflow-hidden ${levelColor(l.level)}`}>
                    {l.timestamp ? `[${l.timestamp}] ` : ''}{l.message || l.raw}
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </div>
        <div className="px-3.5 py-1.5 bg-[#0d1424] border-t border-[var(--border)] text-[9px] text-[var(--faint)]">
          auto-scroll · canlı (SSE)
        </div>
      </section>
    </div>
  );
}
