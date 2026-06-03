'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ChevronDown, ChevronUp, ArrowRight, Globe } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { translations, type Lang } from '@/lib/i18n/landing';
import ContractScanIllustration from '@/components/ContractScanIllustration';

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const t = translations[lang];

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const storedLang = localStorage.getItem('lang');
    if (storedLang === 'ne') setLang('ne');
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
        router.replace('/dashboard');
      }
    });
  }, []);

  const handleQuickExit = () => {
    sessionStorage.clear();
    window.location.replace('https://www.google.com');
  };

  const handleCTA = () => {
    if (isLoggedIn) {
      router.push('/upload');
    } else {
      router.push('/auth/phone');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none"
  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
  strokeLinejoin="round" className="stroke-slate-900 shrink-0">
  <path d="M16 3L4 8v8c0 6 5.5 10.5 12 13 6.5-2.5 12-7 12-13V8L16 3z" />
  <path d="M13 14h4M13 18h6" />
  <path d="M19 10l-2-2-4 4" />
</svg>
<div className="flex flex-col leading-none">
  <span className="font-semibold tracking-tight text-lg text-slate-900">
    {t.nav.brand}
  </span>
  <span className="text-xs text-slate-400 font-normal tracking-wide">
    {lang === 'en' ? 'Worker Protection Platform' : 'कामदार सुरक्षा मञ्च'}
  </span>
</div>
          </div>

          {/* Right actions — desktop */}
          <div className="hidden sm:flex items-center gap-3">
          <div className="bg-slate-100/80 border border-slate-200/60 rounded-full p-1 flex items-center gap-1">
              <Globe className="text-slate-400 w-4 h-4 ml-1 shrink-0" />
              <button
                onClick={() => { setLang('en'); localStorage.setItem('lang', 'en'); }}
                className={lang === 'en'
                  ? 'bg-white text-slate-900 font-medium px-2.5 py-1 rounded-full text-xs shadow-sm transition-all'
                  : 'text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-full text-xs font-medium transition-colors'}
              >
                EN
              </button>
              <button
                onClick={() => { setLang('ne'); localStorage.setItem('lang', 'ne'); }}
                className={lang === 'ne'
                  ? 'bg-white text-slate-900 font-medium px-2.5 py-1 rounded-full text-xs shadow-sm transition-all'
                  : 'text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-full text-xs font-medium transition-colors'}
              >
                नेपाली
              </button>
            </div>
            <button
              onClick={handleQuickExit}
              className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded px-2.5 py-1 transition-colors"
            >
              {t.nav.quickExit}
            </button>
            <button
              onClick={handleCTA}
              className="text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded px-4 py-1.5 transition-colors"
            >
              {t.nav.cta}
            </button>
          </div>

          {/* Right actions — mobile */}
          <div className="flex sm:hidden items-center gap-2">
          <div className="bg-slate-100/80 border border-slate-200/60 rounded-full p-0.5 flex items-center">
              <button
               onClick={() => { setLang('en'); localStorage.setItem('lang', 'en'); }}
               className={lang === 'en'
                 ? 'bg-white text-slate-900 font-medium px-2 py-0.5 rounded-full text-xs shadow-sm transition-all'
                  : 'text-slate-500 px-2 py-0.5 rounded-full text-xs font-medium transition-colors'}
              >
                EN
              </button>
              <button
                onClick={() => { setLang('ne'); localStorage.setItem('lang', 'ne'); }}
                className={lang === 'ne'
                  ? 'bg-white text-slate-900 font-medium px-2 py-0.5 rounded-full text-xs shadow-sm transition-all'
                  : 'text-slate-500 px-2 py-0.5 rounded-full text-xs font-medium transition-colors'}
              >
                नेपाली
              </button>
            </div>
            <button
              onClick={handleQuickExit}
              className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
            >
              ⚠
            </button>
            <button
              onClick={handleCTA}
              className="text-xs font-semibold bg-slate-900 text-white rounded px-3 py-1"
            >
              {lang === 'en' ? 'Check' : 'जाँच'}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
        <div className="max-w-xl w-full">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-slate-500 border border-slate-300 rounded px-3 py-1 mb-6">
            {t.hero.badge}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight mb-6">
            {t.hero.headline}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8">
            {t.hero.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
           <button
             onClick={handleCTA}
             className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-base px-6 py-3 rounded-lg transition-colors"
  >
            {t.hero.ctaPrimary}
             <ArrowRight size={16} />
           </button>

           <a
             href="#how-it-works"
             className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-base px-6 py-3 rounded-lg border border-slate-200 transition-colors"
           >
            {t.hero.ctaSecondary}
           </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-500">{t.hero.trustPill}</p>
            <p className="text-sm text-slate-500">{t.hero.privacyNote}</p>
          </div>
          </div>
          <div className="hidden sm:flex items-center justify-end shrink-0 self-stretch pr-4">
          <ContractScanIllustration />
        </div>
        </div>
      </section>


      {/* CAPABILITIES BAR */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            {t.capabilities.label}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {t.capabilities.items.map((item, i) => (
              <div key={i}>
                <p className="text-xl mb-1">{item.icon}</p>
                <p className="text-base font-bold text-slate-900">{item.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          {t.howItWorks.sectionLabel}
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-12">
          {t.howItWorks.heading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {t.howItWorks.steps.map((step, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <span className="text-sm font-black text-slate-900">{step.number}</span>
              </div>
             
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-base text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VIOLATIONS */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            {t.violations.sectionLabel}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
            {t.violations.heading}
          </h2>
          <p className="text-base text-slate-600 mb-10 max-w-2xl">
            {t.violations.subheading}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.violations.items.map((item, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200 rounded-lg p-5"
              >
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JURISDICTIONS */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          {t.jurisdictions.sectionLabel}
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
          {t.jurisdictions.heading}
        </h2>
        <p className="text-base text-slate-600 mb-8 max-w-2xl">
          {t.jurisdictions.iloStatement}
        </p>
        <div className="flex flex-wrap gap-2">
          {t.jurisdictions.destinations.map((dest, i) => (
            <span
              key={i}
              className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded px-3 py-1.5"
            >
              {dest}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            {t.faq.sectionLabel}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-10">
            {t.faq.heading}
          </h2>
          <div className="max-w-2xl divide-y divide-slate-200">
            {t.faq.items.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-base font-semibold text-slate-900">
                    {item.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp size={18} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400 shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <p className="text-base text-slate-600 leading-relaxed pb-5">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NGO CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 max-w-2xl">
          <h2 className="text-xl font-black text-slate-900 mb-3">{t.ngo.heading}</h2>
          <p className="text-base text-slate-600 mb-6 leading-relaxed">{t.ngo.desc}</p>
          <Link
            href="/auth/phone"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg px-5 py-2.5 transition-colors"
          >
            {t.ngo.cta}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* BOTTOM CTA STRIP */}
      <section className="bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <Shield size={28} className="text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            {lang === 'en'
              ? 'Your contract. Your rights. Your protection.'
              : 'तपाईंको सम्झौता। तपाईंका अधिकार। तपाईंको सुरक्षा।'}
          </h2>
          <p className="text-base text-slate-400 mb-8 max-w-md mx-auto">
            {lang === 'en'
              ? 'Check your employment contract before you sign. It takes under 2 minutes and costs nothing.'
              : 'हस्ताक्षर गर्नु अघि आफ्नो रोजगार सम्झौता जाँच गर्नुहोस्। यसमा २ मिनेटभन्दा कम समय लाग्छ र कुनै खर्च छैन।'}
          </p>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-base px-8 py-3 rounded-lg transition-colors"
          >
            {t.hero.ctaPrimary}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-slate-400" strokeWidth={2} />
            <span className="text-sm font-bold text-slate-500">MigrantShield</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-6">
            {t.footer.disclaimer}
          </p>
          <div className="flex flex-wrap gap-4 mb-6">
            {t.footer.links.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-400">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}