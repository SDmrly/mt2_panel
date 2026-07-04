import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
export function NetworkCard({ rx, tx, history }: { rx: number; tx: number; history: { t: number; rx: number; tx: number }[] }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[var(--heading)] font-bold text-sm">Ağ Trafiği</span>
        <span className="text-[10px] text-[var(--muted)]">↓ {rx} MB/s &nbsp; <span className="text-[var(--primary)]">↑ {tx} MB/s</span></span>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs><linearGradient id="ngrx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity={0.35} /><stop offset="1" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs>
            <YAxis hide /><Area dataKey="rx" stroke="#22d3ee" fill="url(#ngrx)" strokeWidth={2} isAnimationActive={false} dot={false} />
            <Area dataKey="tx" stroke="#34d399" fill="none" strokeWidth={1.6} isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
