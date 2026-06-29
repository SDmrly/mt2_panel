// apps/frontend/src/pages/Logs.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FixedSizeList } from 'react-window';

const LIST_HEIGHT = 600;
const ITEM_SIZE = 18;
import { useQuery } from '@tanstack/react-query';
import { useServices } from '../hooks/useServices';
import { useLogStream } from '../hooks/useLogStream';
import { apiClient } from '../lib/api';
import { levelColor } from '../lib/logLevel';
import { LogLevel, LogMessage } from '../types/log';

const LEVELS: (LogLevel | 'all')[] = ['all', 'error', 'warning', 'info'];

export default function Logs() {
  const { data: services } = useServices();
  const [selected, setSelected] = useState<string | null>(null);
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
    atBottomRef.current = scrollOffset + LIST_HEIGHT >= totalHeight - ITEM_SIZE * 2;
  };

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <aside className="w-56 shrink-0 space-y-1">
        <h2 className="font-semibold mb-2">Servisler</h2>
        {services?.map((s) => (
          <button key={s.name} onClick={() => setSelected(s.name)}
            className={`block w-full text-left px-2 py-1 rounded text-sm ${effectiveSelected === s.name ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
            {s.name}
          </button>
        ))}
      </aside>
      <section className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setFilter(l)}
              className={`px-2 py-1 text-xs rounded border ${filter === l ? 'bg-gray-200' : ''}`}>{l}</button>
          ))}
          {!isQuest && effectiveSelected && <span className="text-xs text-gray-500 ml-auto">{status}</span>}
          {isQuest && <span className="text-xs text-gray-500 ml-auto">init container (tail)</span>}
        </div>
        <div className="flex-1 border rounded bg-gray-50 font-mono text-xs">
          {!services?.length && <p className="p-4 text-gray-400">Servis bulunamadı.</p>}
          {effectiveSelected && (
            <FixedSizeList ref={listRef} height={LIST_HEIGHT} width="100%" itemCount={view.length} itemSize={ITEM_SIZE} onScroll={handleScroll}>
              {({ index, style }: { index: number; style: CSSProperties }) => {
                const l = view[index];
                return (
                  <div style={style} className={`px-2 whitespace-pre overflow-hidden ${levelColor(l.level)}`}>
                    {l.timestamp ? `[${l.timestamp}] ` : ''}{l.message || l.raw}
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </div>
      </section>
    </div>
  );
}
