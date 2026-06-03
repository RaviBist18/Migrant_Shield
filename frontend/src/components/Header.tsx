'use client';
import Link from 'next/link';
import { HelpCircle, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function Header({ title, showBack, backHref = '/', backLabel = 'Back' }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b-2 border-slate-700">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <Link
              href={backHref}
              className="text-emerald-400 font-bold text-sm uppercase tracking-wide shrink-0"
            >
              ← {backLabel}
            </Link>
          )}
          {!showBack && (
            <span className="text-white font-black text-lg tracking-tight truncate">
              🛡 MigrantShield
            </span>
          )}
        </div>
        <h1 className={`font-bold text-white text-base truncate ${showBack ? 'text-center flex-1 mx-2' : 'hidden'}`}>
          {title}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/help" className="p-2 text-slate-400 hover:text-white">
            <HelpCircle size={22} />
          </Link>
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white">
            <Settings size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}