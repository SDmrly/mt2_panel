// apps/frontend/src/lib/timeAgo.ts
export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s önce`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}s önce`;
  const d = Math.floor(h / 24); return `${d}g önce`;
}
