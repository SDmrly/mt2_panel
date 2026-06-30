// apps/frontend/src/pages/Register.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
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
    <div className="max-w-sm mx-auto mt-24 p-6 border rounded-lg text-center space-y-3">
      <p>Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.</p>
      <Link to="/login" className="text-blue-600 underline">Girişe dön</Link>
    </div>
  );
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-24 space-y-4 p-6 border rounded-lg">
      <h1 className="text-xl font-bold">Kayıt Ol</h1>
      <label className="block">Kullanıcı Adı<input className="w-full border p-2 rounded" value={username} onChange={(e) => setU(e.target.value)} /></label>
      <label className="block">E-posta<input type="email" className="w-full border p-2 rounded" value={email} onChange={(e) => setE(e.target.value)} /></label>
      <label className="block">Şifre<input type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setP(e.target.value)} /></label>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">Kayıt Ol</button>
      <Link to="/login" className="block text-center text-sm text-blue-600">Zaten hesabın var mı? Giriş</Link>
    </form>
  );
}
