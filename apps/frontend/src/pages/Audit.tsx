// apps/frontend/src/pages/Audit.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudit } from '../hooks/useAudit';
import { AuditAction } from '../types/audit';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

const ACTIONS: (AuditAction | '')[] = ['', 'login', 'login_failed', 'logout', 'service_restart', 'service_stop', 'deploy', 'rollback'];

const RESULT_VARIANT: Record<string, 'success' | 'destructive'> = {
  success: 'success',
  failure: 'destructive',
};

const fieldClass =
  'bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius)] px-2 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export default function Audit() {
  const { t } = useTranslation();
  const [action, setAction] = useState('');
  const [username, setUsername] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data, isLoading } = useAudit({
    action: action || undefined,
    username: username || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    offset,
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--heading)]">{t('audit.title')}</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-2 text-sm flex-wrap">
        <select
          className={fieldClass}
          value={action}
          onChange={(e) => { setAction(e.target.value); setOffset(0); }}
        >
          {ACTIONS.map((a) => <option key={a} value={a}>{a || t('audit.allActions')}</option>)}
        </select>
        <input
          className={fieldClass}
          placeholder={t('audit.usernamePlaceholder')}
          value={username}
          onChange={(e) => { setUsername(e.target.value); setOffset(0); }}
        />
        <input
          type="date"
          className={fieldClass}
          value={from}
          onChange={(e) => { setFrom(e.target.value); setOffset(0); }}
          title={t('audit.fromTitle')}
        />
        <input
          type="date"
          className={fieldClass}
          value={to}
          onChange={(e) => { setTo(e.target.value); setOffset(0); }}
          title={t('audit.toTitle')}
        />
      </div>

      {isLoading || !data ? (
        <p className="p-6 text-[var(--muted)]">{t('common.loading')}</p>
      ) : (
        <>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] text-xs">
                  <th className="py-1.5 font-medium">{t('audit.date')}</th>
                  <th className="font-medium">{t('audit.user')}</th>
                  <th className="font-medium">{t('audit.action')}</th>
                  <th className="font-medium">{t('audit.detail')}</th>
                  <th className="font-medium">{t('audit.result')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-[var(--muted)] text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="text-[var(--foreground)]">{r.username ?? '—'}</td>
                    <td><Badge variant="outline">{r.action}</Badge></td>
                    <td className="text-xs">
                      <div className="font-mono text-[var(--foreground)]">{r.target ?? '—'}</div>
                      {r.ip && <div className="text-[var(--faint)]">{r.ip}</div>}
                    </td>
                    <td>
                      <Badge variant={RESULT_VARIANT[r.result] ?? 'outline'}>{r.result}</Badge>
                    </td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[var(--faint)] text-xs">{t('audit.noRecords')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              {t('audit.prev')}
            </Button>
            <span className="text-xs">
              {data.total === 0
                ? t('audit.paginationEmpty')
                : t('audit.paginationRange', { start: offset + 1, end: Math.min(offset + limit, data.total), total: data.total })}
            </span>
            <Button size="sm" variant="outline" disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)}>
              {t('audit.next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
