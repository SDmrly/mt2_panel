import { useState } from 'react';
import { Monitor, Sun, Moon } from 'lucide-react';
import { getPref, setPref, ThemePref } from '../../lib/theme';
import { cn } from '../../lib/utils';

const OPTS: { pref: ThemePref; icon: typeof Monitor; label: string }[] = [
  { pref: 'system', icon: Monitor, label: 'system' },
  { pref: 'light', icon: Sun, label: 'light' },
  { pref: 'dark', icon: Moon, label: 'dark' },
];

export function ThemeToggle() {
  const [pref, setLocal] = useState<ThemePref>(() => getPref());
  const choose = (p: ThemePref) => { setPref(p); setLocal(p); };
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
      {OPTS.map(({ pref: p, icon: Icon, label }) => (
        <button
          key={p}
          onClick={() => choose(p)}
          aria-label={label}
          title={label}
          className={cn(
            'px-1.5 py-1',
            pref === p ? 'bg-[var(--active)] text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
