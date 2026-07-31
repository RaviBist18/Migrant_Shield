"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Globe } from "lucide-react";
import { translations, type Lang } from "@/lib/i18n/landing";

export default function AboutPage() {
  const [lang, setLang] = useState<Lang>("en");
  const router = useRouter();
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-slate-900 shrink-0"
            >
              <path d="M16 3L4 8v8c0 6 5.5 10.5 12 13 6.5-2.5 12-7 12-13V8L16 3z" />
              <path d="M13 14h4M13 18h6" />
              <path d="M19 10l-2-2-4 4" />
            </svg>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-semibold tracking-tight text-base sm:text-lg text-slate-900 truncate">
                MigrantShield
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 font-normal tracking-wide truncate">
                {lang === "ne"
                  ? "कामदार सुरक्षा मञ्च"
                  : "Worker Protection Platform"}
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors shrink-0 whitespace-nowrap"
          >
            {lang === "ne" ? "← गृहपृष्ठमा फर्कनुहोस्" : "← Back "}
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-14 pb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-4">
          {t.about.heading}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          {t.about.intro}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16 flex flex-col gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {t.about.missionHeading}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t.about.missionBody}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {t.about.whyFreeHeading}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t.about.whyFreeBody}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Shield size={17} className="text-slate-400" />
            {t.about.privacyHeading}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t.about.privacyBody}
          </p>
        </div>
      </section>

      <section className="bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <h2 className="text-xl font-black text-white mb-6">
            {t.about.ctaHeading}
          </h2>
          <button
            onClick={() => router.push("/auth/phone")}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-base px-8 py-3 rounded-lg transition-colors"
          >
            {t.about.ctaButton}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
