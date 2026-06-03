'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/i18n/landing';
import type { Lang } from '@/lib/i18n/landing';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'en' || stored === 'ne') setLang(stored);
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('lang');
      setLang(stored === 'ne' ? 'ne' : 'en');
    };
    window.addEventListener('langchange', sync);
    return () => window.removeEventListener('langchange', sync);
  }, []);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  if (!user) return null;

  const t = translations[lang].upload;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t.errorType);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t.errorSize);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem('upload_file_data', reader.result as string);
      sessionStorage.setItem('upload_file_name', file.name);
      sessionStorage.setItem('upload_file_size', String(file.size));
      sessionStorage.setItem('upload_file_type', file.type);
      router.push('/upload/preview');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-lg mx-auto px-4 py-12">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {t.heading}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.subheading}
          </p>
        </div>

        <div
          className="border-2 border-dashed border-slate-300 rounded-xl bg-white p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">{t.tapToSelect}</p>
            <p className="text-xs text-slate-400 mt-1">{t.tapSub}</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-4 gap-2">
          {['JPG', 'PNG', 'WEBP', 'PDF'].map((fmt) => (
            <div key={fmt} className="flex items-center justify-center py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 tracking-wide">{fmt}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          {t.securityNote}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 flex items-center justify-center gap-1.5 group text-slate-400 hover:text-slate-900 text-sm font-medium transition-colors duration-200"
        >
          {t.dashboardLink}
          <svg className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:translate-x-0.5"
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>

      </main>
    </div>
  );
}