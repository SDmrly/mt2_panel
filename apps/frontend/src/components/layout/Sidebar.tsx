// apps/frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Server, ScrollText, Rocket, History, ShieldCheck, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../lib/utils';

const main = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/services', key: 'nav.services', icon: Server },
  { to: '/logs', key: 'nav.logs', icon: ScrollText },
];
// Deploy/Geçmiş sadece admin'e görünür: deploy endpointleri RolesGuard @Roles('admin') ile korunuyor,
// non-admin kullanıcı bu sayfalara girse boş/erişimsiz bir ekranla karşılaşır.
const admin = [
  { to: '/deploy', key: 'nav.deploy', icon: Rocket },
  { to: '/deployments', key: 'nav.deployments', icon: History },
  { to: '/audit', key: 'nav.audit', icon: ShieldCheck },
  { to: '/users', key: 'nav.users', icon: Users },
];

function Item({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
      isActive ? 'bg-[var(--active)] text-[var(--primary)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]',
    )}>
      <Icon size={16} /> {label}
    </NavLink>
  );
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const { t } = useTranslation();
  return (
    <aside className="w-[200px] shrink-0 bg-[var(--sidebar)] border-r border-[var(--border)] p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)]" />
        <span className="font-extrabold text-[var(--heading)]">MT2 Panel</span>
      </div>
      {main.map((i) => <Item key={i.to} to={i.to} icon={i.icon} label={t(i.key)} />)}
      {role === 'admin' && (
        <>
          <div className="text-[10px] tracking-wide text-[var(--faint)] px-3 pt-3 pb-1">{t('nav.management')}</div>
          {admin.map((i) => <Item key={i.to} to={i.to} icon={i.icon} label={t(i.key)} />)}
        </>
      )}
    </aside>
  );
}
