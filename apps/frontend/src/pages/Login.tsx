// apps/frontend/src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { apiErrorText } from '../lib/apiError';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';

const inputClass =
  'mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export default function Login() {
  const { t } = useTranslation();
  const [username, setU] = useState(''); const [password, setP] = useState('');
  const [err, setErr] = useState(''); const nav = useNavigate(); const setAuth = useAuthStore((s) => s.setAuth);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setErr(t('auth.usernamePasswordRequired')); return; }
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      setAuth(data); nav('/dashboard');
    } catch (error: any) { setErr(apiErrorText(error, t)); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]" />
          <span className="font-extrabold text-lg text-[var(--heading)]">MT2 Panel</span>
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <h1 className="text-xl font-bold text-[var(--heading)] text-center">{t('auth.loginTitle')}</h1>
          <label className="block text-sm text-[var(--muted)]">{t('auth.username')}
            <input className={inputClass} value={username} onChange={(e) => setU(e.target.value)} /></label>
          <label className="block text-sm text-[var(--muted)]">{t('auth.password')}
            <input type="password" className={inputClass} value={password} onChange={(e) => setP(e.target.value)} /></label>
          {err && <p className="text-[var(--destructive)] text-sm">{err}</p>}
          <Button type="submit" className="w-full">{t('auth.login')}</Button>
          <Link to="/register" className="block text-center text-sm text-[var(--primary)] hover:underline">{t('auth.noAccount')}</Link>
        </form>
      </div>
    </div>
  );
}
