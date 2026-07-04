// apps/frontend/src/components/layout/Topbar.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/services': 'Servisler', '/logs': 'Loglar',
  '/deploy': 'Deploy', '/deployments': 'Geçmiş', '/audit': 'Audit', '/users': 'Kullanıcılar',
};

export function Topbar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const title = TITLES[pathname] ?? (pathname.startsWith('/services/') ? 'Servis Detayı' : 'MT2 Panel');
  const logout = () => { clear(); nav('/login'); };
  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="font-bold text-[var(--heading)]">{title}</div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-[#04222a] text-xs font-extrabold flex items-center justify-center">
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="text-sm text-[var(--foreground)]">{user?.username}</span>
        <button onClick={logout} title="Çıkış" className="ml-2 text-[var(--muted)] hover:text-[var(--destructive)]"><LogOut size={16} /></button>
      </div>
    </header>
  );
}
