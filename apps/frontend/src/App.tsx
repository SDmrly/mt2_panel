import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Pending from './pages/Pending';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Logs from './pages/Logs';
import Deploy from './pages/Deploy';
import Deployments from './pages/Deployments';
import Audit from './pages/Audit';
import Users from './pages/Users';
import { type ReactElement } from 'react';

function AuthLayout({ children }: { children: ReactElement }) {
  const token = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.user?.status);
  if (!token) return <Navigate to="/login" replace />;
  if (status !== 'active') return <Navigate to="/pending" replace />;
  return (<div className="min-h-screen flex flex-col"><NavBar /><main className="flex-1">{children}</main></div>);
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/dashboard" element={<AuthLayout><Dashboard /></AuthLayout>} />
        <Route path="/services" element={<AuthLayout><Services /></AuthLayout>} />
        <Route path="/services/:name" element={<AuthLayout><ServiceDetail /></AuthLayout>} />
        <Route path="/logs" element={<AuthLayout><Logs /></AuthLayout>} />
        <Route path="/deploy" element={<AuthLayout><Deploy /></AuthLayout>} />
        <Route path="/deployments" element={<AuthLayout><Deployments /></AuthLayout>} />
        <Route path="/audit" element={<AuthLayout><Audit /></AuthLayout>} />
        <Route path="/users" element={<AuthLayout><Users /></AuthLayout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
