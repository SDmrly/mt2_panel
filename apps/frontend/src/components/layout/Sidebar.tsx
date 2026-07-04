// apps/frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, ScrollText, Rocket, History, ShieldCheck, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../lib/utils';

const main = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/services', label: 'Servisler', icon: Server },
  { to: '/logs', label: 'Loglar', icon: ScrollText },
];
// Deploy/Geçmiş sadece admin'e görünür: deploy endpointleri RolesGuard @Roles('admin') ile korunuyor,
// non-admin kullanıcı bu sayfalara girse boş/erişimsiz bir ekranla karşılaşır.
const admin = [
  { to: '/deploy', label: 'Deploy', icon: Rocket },
  { to: '/deployments', label: 'Geçmiş', icon: History },
  { to: '/audit', label: 'Audit', icon: ShieldCheck },
  { to: '/users', label: 'Kullanıcılar', icon: Users },
];

function Item({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
      isActive ? 'bg-[#15233d] text-[var(--primary)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#0f1a2e]',
    )}>
      <Icon size={16} /> {label}
    </NavLink>
  );
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <aside className="w-[200px] shrink-0 bg-[var(--sidebar)] border-r border-[var(--border)] p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)]" />
        <span className="font-extrabold text-[var(--heading)]">MT2 Panel</span>
      </div>
      {main.map((i) => <Item key={i.to} {...i} />)}
      {role === 'admin' && (
        <>
          <div className="text-[10px] tracking-wide text-[var(--faint)] px-3 pt-3 pb-1">YÖNETİM</div>
          {admin.map((i) => <Item key={i.to} {...i} />)}
        </>
      )}
    </aside>
  );
}
