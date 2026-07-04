import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

const LANGS = ['tr', 'en'] as const;

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const active = i18n.language?.startsWith('en') ? 'en' : 'tr';
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => i18n.changeLanguage(l)}
          className={cn(
            'px-2 py-1 text-[11px] font-semibold uppercase',
            active === l ? 'bg-[var(--active)] text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
