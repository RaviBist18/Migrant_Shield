"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { translations } from "@/lib/i18n/landing";
import type { Lang } from "@/lib/i18n/landing";

export default function PhonePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "ne") setLang("ne");
  }, []);

  const t = translations[lang].auth;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleSend() {
    setError("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (sbError) {
      setError(sbError.message);
      return;
    }
    localStorage.setItem("otp_email", email);
    router.push("/auth/verify");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Lang toggle */}
      <div className="w-full max-w-md flex justify-end mb-3">
        <div className="bg-slate-100 border border-slate-200 rounded-full p-0.5 flex items-center">
          <button
            onClick={() => {
              setLang("en");
              localStorage.setItem("lang", "en");
            }}
            className={
              lang === "en"
                ? "bg-white text-slate-900 font-medium px-2.5 py-1 rounded-full text-xs shadow-sm transition-all"
                : "text-slate-500 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            }
          >
            EN
          </button>
          <button
            onClick={() => {
              setLang("ne");
              localStorage.setItem("lang", "ne");
            }}
            className={
              lang === "ne"
                ? "bg-white text-slate-900 font-medium px-2.5 py-1 rounded-full text-xs shadow-sm transition-all"
                : "text-slate-500 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            }
          >
            नेपाली
          </button>
        </div>
      </div>
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
              {t.signInHeading}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.signInSub}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t.emailPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            {loading ? t.sending : t.sendCode}
          </button>
        </div>

        {/* Privacy note */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-500 leading-relaxed text-center">
          🔒 {t.privacyNote}
        </div>
      </div>

      {/* Continue without account */}
      <div className="mt-4 w-full max-w-md border border-slate-200 rounded-xl p-4 bg-white text-center">
        <p className="text-xs text-slate-500 mb-2">
          {lang === "ne" ? "खाता चाहिँदैन?" : "Don't want an account?"}
        </p>
        <button
          onClick={() => router.push("/upload")}
          className="text-sm font-semibold text-slate-900 hover:underline"
        >
          {lang === "ne"
            ? "खाता बिना जाँच गर्नुहोस् →"
            : "Continue without account →"}
        </button>
        <p className="text-xs text-slate-400 mt-1.5">
          {lang === "ne"
            ? "रिपोर्ट सुरक्षित गर्न खाता चाहिन्छ"
            : "Account required to save reports"}
        </p>
      </div>

      {/* Back to home */}
      <button
        onClick={() => router.push("/")}
        className="mt-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        {t.backToHome}
      </button>
    </main>
  );
}
