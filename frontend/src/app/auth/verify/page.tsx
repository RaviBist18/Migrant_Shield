'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { translations } from '@/lib/i18n/landing';
import type { Lang } from '@/lib/i18n/landing';

export default function VerifyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'ne') setLang('ne');
    const storedEmail = localStorage.getItem('otp_email');
    if (!storedEmail) {
      router.replace('/auth/phone');
      return;
    }
    setEmail(storedEmail);
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('lang');
      setLang(stored === 'ne' ? 'ne' : 'en');
    };
    window.addEventListener('langchange', sync);
    return () => window.removeEventListener('langchange', sync);
  }, []);

  const t = translations[lang].auth;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleVerify() {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    const { error: sbError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    setLoading(false);
    if (sbError) {
      setError(sbError.message);
      return;
    }
    localStorage.removeItem('otp_email');
    router.replace('/dashboard');
  }

  async function handleResend() {
    setError('');
    setResendSuccess(false);
    setResending(true);
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setResending(false);
    if (sbError) {
      setError(sbError.message);
      return;
    }
    setResendSuccess(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">

        {/* Brand emblem */}
        <div className="flex flex-col items-center space-y-3">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M17 18H27M17 23H31M17 28H24"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M29 26L29 34M29 34L26 31M29 34L32 31"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t.otpHeading}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t.otpSub}
            </p>
            {email && (
              <p className="text-sm font-medium text-slate-700 mt-1">{email}</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Resend success */}
        {resendSuccess && (
          <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm font-medium">
            Code resent. Check your inbox.
          </div>
        )}

        {/* OTP input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            {t.verificationLabel}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder={t.otpPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all tracking-widest text-center font-mono"
              autoComplete="one-time-code"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            {loading ? t.verifying : t.verify}
          </button>
        </div>

        {/* Resend */}
        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:cursor-not-allowed"
          >
            {resending ? 'Sending...' : t.resend}
          </button>
        </div>

        {/* Privacy note */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-500 leading-relaxed text-center">
          🔒 {t.privacyNote}
        </div>
      </div>

      {/* Back */}
      <button
        onClick={() => router.push('/auth/phone')}
        className="mt-6 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        {t.backToHome}
      </button>
    </main>
  );
}