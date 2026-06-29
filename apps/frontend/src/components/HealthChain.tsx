// apps/frontend/src/components/HealthChain.tsx
import { ServiceCard } from '../types/service';
const ORDER: ServiceCard['role'][] = ['database', 'db-process', 'auth', 'channel', 'proxy'];
export function HealthChain({ services }: { services: ServiceCard[] }) {
  const nodes = ORDER.flatMap((role) => services.filter((s) => s.role === role));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {nodes.map((s, i) => (
        <span key={s.name} className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs ${s.health === 'healthy' || s.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {s.name}</span>
          {i < nodes.length - 1 && <span>→</span>}
        </span>
      ))}
    </div>
  );
}
