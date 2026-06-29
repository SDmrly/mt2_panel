// apps/frontend/src/components/ServiceCard.tsx
import { Link } from 'react-router-dom';
import { ServiceCard as TCard } from '../types/service';
const ROLE_ICON: Record<string, string> = {
  database: '🗄️', 'db-process': '🧩', auth: '🔑', channel: '🎮', proxy: '🚪', 'quest-compiler': '🛠️',
};
const HEALTH_COLOR: Record<string, string> = {
  healthy: 'text-green-600', unhealthy: 'text-red-600', starting: 'text-yellow-600', none: 'text-gray-400',
};
export function ServiceCard({ service: s }: { service: TCard }) {
  return (
    <Link to={`/services/${s.name}`} className="block border rounded-lg p-4 hover:shadow">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          <span aria-hidden="true">{ROLE_ICON[s.role]} </span>
          <span>{s.name}</span>
        </span>
        <span className={HEALTH_COLOR[s.health]}>{s.health}</span>
      </div>
      <div className="text-sm text-gray-500">{s.role}{s.role === 'channel' && s.channel !== undefined ? ` · ch${s.channel}` : ''}</div>
      <div className="text-xs text-gray-400">{s.image.name}:{s.image.tag} · {s.uptime}</div>
      {s.role === 'quest-compiler' && s.exitCode !== undefined && (
        <div className={s.exitCode === 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs font-bold'}>
          exit {s.exitCode}</div>)}
    </Link>
  );
}
