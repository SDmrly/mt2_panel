export function Gauge({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
  const ARC = 198; // 270° of circumference 264 (r=42)
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="text-center">
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="9" strokeDasharray="198 264" strokeLinecap="round" transform="rotate(135 50 50)" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeDasharray={`${(v / 100) * ARC} 264`} strokeLinecap="round" transform="rotate(135 50 50)" />
        <text x="50" y="48" textAnchor="middle" fill="var(--heading)" fontSize="20" fontWeight="700">{Math.round(v)}%</text>
        <text x="50" y="63" textAnchor="middle" fill="var(--faint)" fontSize="9">{label}</text>
      </svg>
      {sub && <div className="text-[10px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
