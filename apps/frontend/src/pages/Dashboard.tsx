// apps/frontend/src/pages/Dashboard.tsx
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { HealthChain } from '../components/HealthChain';
export default function Dashboard() {
  const { data, isLoading } = useServices();
  if (isLoading || !data) return <p className="p-6">Yükleniyor…</p>;
  const qc = data.find((s) => s.role === 'quest-compiler');
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Genel Durum</h1>
      {qc && qc.exitCode !== undefined && qc.exitCode !== 0 && (
        <div className="bg-red-600 text-white p-3 rounded">⚠ quest-compiler hata ile bitti (exit {qc.exitCode}). Kanallar başlamamış olabilir.</div>)}
      <section><h2 className="font-semibold mb-2">Healthcheck Zinciri</h2><HealthChain services={data} /></section>
      <Link to="/services" className="text-blue-600 underline">Tüm servisler →</Link>
    </div>
  );
}
