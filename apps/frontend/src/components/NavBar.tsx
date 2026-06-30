// apps/frontend/src/components/NavBar.tsx
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/services', label: 'Servisler' },
  { to: '/logs', label: 'Loglar' },
] as const;

export function NavBar() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex gap-6 items-center">
      <span className="font-bold text-blue-400 mr-4">MT2 Panel</span>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive
              ? 'text-blue-400 font-semibold underline underline-offset-4'
              : 'hover:text-blue-300 transition-colors'
          }
        >
          {label}
        </NavLink>
      ))}
      {role === 'admin' && (
        <NavLink
          to="/deploy"
          className={({ isActive }) =>
            isActive
              ? 'text-blue-400 font-semibold underline underline-offset-4'
              : 'hover:text-blue-300 transition-colors'
          }
        >
          Deploy
        </NavLink>
      )}
      {role === 'admin' && (
        <NavLink
          to="/deployments"
          className={({ isActive }) =>
            isActive
              ? 'text-blue-400 font-semibold underline underline-offset-4'
              : 'hover:text-blue-300 transition-colors'
          }
        >
          Geçmiş
        </NavLink>
      )}
      {role === 'admin' && (
        <NavLink
          to="/audit"
          className={({ isActive }) =>
            isActive
              ? 'text-blue-400 font-semibold underline underline-offset-4'
              : 'hover:text-blue-300 transition-colors'
          }
        >
          Audit
        </NavLink>
      )}
      {role === 'admin' && (
        <NavLink
          to="/users"
          className={({ isActive }) =>
            isActive
              ? 'text-blue-400 font-semibold underline underline-offset-4'
              : 'hover:text-blue-300 transition-colors'
          }
        >
          Kullanıcılar
        </NavLink>
      )}
    </nav>
  );
}
