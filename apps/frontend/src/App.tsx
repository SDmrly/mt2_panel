import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NavBar } from './components/NavBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Logs from './pages/Logs';
import { type ReactElement } from 'react';

function AuthLayout({ children }: { children: ReactElement }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<AuthLayout><Dashboard /></AuthLayout>} />
        <Route path="/services" element={<AuthLayout><Services /></AuthLayout>} />
        <Route path="/services/:name" element={<AuthLayout><ServiceDetail /></AuthLayout>} />
        <Route path="/logs" element={<AuthLayout><Logs /></AuthLayout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
