// apps/frontend/src/pages/Pending.tsx
import { useAuthStore } from '../store/auth';
export default function Pending() {
  const clear = useAuthStore((s) => s.clear);
  return (
    <div className="max-w-md mx-auto mt-24 p-6 border rounded-lg text-center space-y-4">
      <h1 className="text-xl font-bold">Hesabınız onay bekliyor</h1>
      <p className="text-gray-600">Yönetici hesabınızı onayladığında panele erişebileceksiniz.</p>
      <button className="px-3 py-1 border rounded" onClick={() => { clear(); window.location.href = '/login'; }}>Çıkış</button>
    </div>
  );
}
