// apps/frontend/src/pages/Services.tsx
import { useTranslation } from 'react-i18next';
import { useServices } from '../hooks/useServices';
import { ServiceCard } from '../components/ServiceCard';

export default function Services() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useServices();
  if (isLoading) return <p className="p-6 text-[var(--muted)]">{t('common.loading')}</p>;
  if (isError) return <p className="p-6 text-[var(--destructive)]">{t('services.fetchError')}</p>;
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">{t('services.title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data!.map((s) => <ServiceCard key={s.name} service={s} />)}
      </div>
    </div>
  );
}
