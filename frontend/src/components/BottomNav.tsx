'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, Clock } from 'lucide-react';
import { translations } from '@/lib/i18n/landing';
import type { Lang } from '@/lib/i18n/landing';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'navHome' },
  { href: '/upload', icon: Upload, labelKey: 'navUpload' },
  { href: '/history', icon: Clock, labelKey: 'navHistory' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'ne') setLang('ne');
  }, []);

  const t = translations[lang].nav;

  const hide = pathname === '/' || pathname.startsWith('/auth');
  if (hide) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-3 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center py-3 min-h-[60px] gap-1 transition-colors relative ${
                active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-xs tracking-wide ${active ? 'font-semibold' : 'font-normal'}`}>
                {t[labelKey]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}