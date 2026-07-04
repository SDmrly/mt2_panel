// apps/frontend/src/pages/Register.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';

const inputClass =
  'mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]" />
          <span className="font-extrabold text-lg text-[var(--heading)]">MT2 Panel</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Register() {
  const [username, setU] = useState(''); const [email, setE] = useState(''); const [password, setP] = useState('');
  const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!username || !email || !password) { setErr('Tüm alanlar zorunlu'); return; }
    try { await apiClient.post('/auth/register', { username, email, password }); setDone(true); }
    catch (e: any) { setErr(e?.response?.status === 409 ? 'Kullanıcı adı veya e-posta kullanımda' : 'Kayıt başarısız'); }
  };
  if (done) return (
    <AuthShell>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm text-center space-y-3">
        <p className="text-[var(--foreground)]">Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.</p>
        <Link to="/login" className="text-[var(--primary)] underline">Girişe dön</Link>
      </div>
    </AuthShell>
  );
  return (
    <AuthShell>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-[var(--heading)] text-center">Kayıt Ol</h1>
        <label className="block text-sm text-[var(--muted)]">Kullanıcı Adı
          <input className={inputClass} value={username} onChange={(e) => setU(e.target.value)} /></label>
        <label className="block text-sm text-[var(--muted)]">E-posta
          <input type="email" className={inputClass} value={email} onChange={(e) => setE(e.target.value)} /></label>
        <label className="block text-sm text-[var(--muted)]">Şifre
          <input type="password" className={inputClass} value={password} onChange={(e) => setP(e.target.value)} /></label>
        {err && <p className="text-[var(--destructive)] text-sm">{err}</p>}
        <Button type="submit" className="w-full">Kayıt Ol</Button>
        <Link to="/login" className="block text-center text-sm text-[var(--primary)] hover:underline">Zaten hesabın var mı? Giriş</Link>
      </form>
    </AuthShell>
  );
}
