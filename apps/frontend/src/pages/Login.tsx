// apps/frontend/src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
export default function Login() {
  const [username, setU] = useState(''); const [password, setP] = useState('');
  const [err, setErr] = useState(''); const nav = useNavigate(); const setAuth = useAuthStore((s) => s.setAuth);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setErr('Kullanıcı adı ve şifre zorunlu'); return; }
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      setAuth(data); nav('/dashboard');
    } catch { setErr('Kullanıcı adı veya şifre hatalı'); }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-24 space-y-4 p-6 border rounded-lg">
      <h1 className="text-xl font-bold">MT2 Panel</h1>
      <label className="block">Kullanıcı Adı
        <input className="w-full border p-2 rounded" value={username} onChange={(e) => setU(e.target.value)} /></label>
      <label className="block">Şifre
        <input type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setP(e.target.value)} /></label>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">Giriş</button>
      <Link to="/register" className="block text-center text-sm text-blue-600">Hesabın yok mu? Kayıt ol</Link>
    </form>
  );
}
