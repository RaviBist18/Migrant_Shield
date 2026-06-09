"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import type { Lang } from "@/lib/i18n/landing";
import BottomNav from "@/components/BottomNav";

type FaqItem = {
  emoji: string;
  question: string;
  answer: React.ReactNode;
};

const faqsEn: FaqItem[] = [
  {
    emoji: "📄",
    question: "What is a contract?",
    answer:
      "A contract is a written agreement between you and your employer. It says how much you earn, your working hours, and your rights. You must read it carefully before signing.",
  },
  {
    emoji: "🚫",
    question: "Can my employer charge me recruitment fees?",
    answer:
      "No. Employers must never deduct recruitment or agency fees from your salary. This is illegal in most countries. If your contract has this clause, do not sign.",
  },
  {
    emoji: "🛂",
    question: "Can my employer keep my passport?",
    answer:
      "No. Your passport belongs to you. No employer or agent has the right to take or hold your passport. This is illegal. Keep your passport safe at all times.",
  },
  {
    emoji: "⏰",
    question: "How many hours can I work per week?",
    answer:
      "The legal maximum in most countries is 48 hours per week. Overtime must be paid at a higher rate and must be voluntary. You cannot be forced to work extra hours.",
  },
  {
    emoji: "💰",
    question: "What is the minimum wage?",
    answer:
      "Each country sets a minimum monthly wage. In Malaysia it is RM 1,500. In Qatar it is QAR 1,000. Your salary must not fall below this amount.",
  },
  {
    emoji: "📞",
    question: "Who can I call for help?",
    answer:
      "Malaysia: Labour Department 03-8000-8000. Qatar: ADLSA 800-8888. UAE: MOHRE 800-60. Nepal Embassy: +60-3-4257-6804. You can also contact MigrantShield support.",
  },
  {
    emoji: "🔒",
    question: "Is my data safe?",
    answer:
      "Yes. Your documents are encrypted and never shared with anyone. MigrantShield does not store your original documents after analysis is complete.",
  },
  {
    emoji: "📤",
    question: "How do I upload my contract?",
    answer:
      "Go to the Upload page from your dashboard. You can upload a PDF or take a photo of your contract. Our AI will analyse it and show you any risks within minutes.",
  },
  {
    emoji: "📊",
    question: "What does the risk report show?",
    answer:
      "The report shows illegal or unfair clauses found in your contract, explains what each clause means, and tells you what action you can take. Red flags are high risk, yellow are warnings.",
  },
  {
    emoji: "✉️",
    question: "How do I contact MigrantShield support?",
    answer: (
      <>
        Email us at{" "}
        <a
          href="mailto:ravibist103@gmail.com"
          className="text-teal-500 underline hover:text-teal-400"
        >
          ravibist103@gmail.com
        </a>
        . We aim to respond within 48 hours. For emergencies, please contact
        your nearest embassy or labour department.
      </>
    ),
  },
];

const faqsNe: FaqItem[] = [
  {
    emoji: "📄",
    question: "सम्झौता भनेको के हो?",
    answer:
      "सम्झौता तपाईं र तपाईंको नियोक्ताबीचको लिखित सहमति हो। यसमा तपाईंको तलब, काम गर्ने घन्टा र अधिकारहरू उल्लेख हुन्छन्। हस्ताक्षर गर्नु अघि ध्यानपूर्वक पढ्नुहोस्।",
  },
  {
    emoji: "🚫",
    question: "के नियोक्ताले मलाई भर्ती शुल्क लिन सक्छ?",
    answer:
      "होइन। नियोक्ताले कहिल्यै पनि तपाईंको तलबबाट भर्ती वा एजेन्सी शुल्क काट्न पाउँदैन। अधिकांश देशमा यो गैरकानूनी छ। यदि तपाईंको सम्झौतामा यस्तो धारा छ भने, हस्ताक्षर नगर्नुहोस्।",
  },
  {
    emoji: "🛂",
    question: "के नियोक्ताले मेरो राहदानी राख्न सक्छ?",
    answer:
      "होइन। राहदानी तपाईंको हो। कुनै पनि नियोक्ता वा एजेन्टलाई तपाईंको राहदानी लिन वा राख्न अधिकार छैन। यो गैरकानूनी हो। आफ्नो राहदानी सधैं सुरक्षित राख्नुहोस्।",
  },
  {
    emoji: "⏰",
    question: "म हप्तामा कति घन्टा काम गर्न सक्छु?",
    answer:
      "अधिकांश देशमा कानूनी अधिकतम ४८ घन्टा प्रति हप्ता हो। ओभरटाइम उच्च दरमा तिरिनुपर्छ र यो ऐच्छिक हुनुपर्छ। तपाईंलाई अतिरिक्त घन्टा काम गर्न बाध्य पार्न सकिँदैन।",
  },
  {
    emoji: "💰",
    question: "न्यूनतम ज्याला कति हो?",
    answer:
      "प्रत्येक देशले न्यूनतम मासिक ज्याला तोक्छ। मलेसियामा RM १,५०० र कतारमा QAR १,००० छ। तपाईंको तलब यो रकमभन्दा कम हुनु हुँदैन।",
  },
  {
    emoji: "📞",
    question: "सहायताका लागि म कहाँ फोन गर्न सक्छु?",
    answer:
      "मलेसिया: श्रम विभाग ०३-८०००-८०००। कतार: ADLSA ८००-८८८८। UAE: MOHRE ८००-६०। नेपाली दूतावास: +६०-३-४२५७-६८०४। तपाईं MigrantShield सहायतामा पनि सम्पर्क गर्न सक्नुहुन्छ।",
  },
  {
    emoji: "🔒",
    question: "के मेरो डेटा सुरक्षित छ?",
    answer:
      "हो। तपाईंका कागजातहरू इन्क्रिप्ट गरिएका छन् र कसैसँग साझा गरिँदैन। विश्लेषण पूरा भएपछि MigrantShield ले तपाईंका मूल कागजातहरू भण्डारण गर्दैन।",
  },
  {
    emoji: "📤",
    question: "म आफ्नो सम्झौता कसरी अपलोड गर्छु?",
    answer:
      "आफ्नो ड्यासबोर्डबाट अपलोड पृष्ठमा जानुहोस्। तपाईं PDF अपलोड गर्न सक्नुहुन्छ वा सम्झौताको फोटो खिच्न सक्नुहुन्छ। हाम्रो AI ले केही मिनेटमा यसलाई विश्लेषण गरी जोखिमहरू देखाउनेछ।",
  },
  {
    emoji: "📊",
    question: "जोखिम रिपोर्टमा के देखिन्छ?",
    answer:
      "रिपोर्टले तपाईंको सम्झौतामा भेटिएका अवैध वा अनुचित धाराहरू देखाउँछ, प्रत्येक धाराको अर्थ बुझाउँछ र तपाईंले के कदम चाल्न सक्नुहुन्छ भनी बताउँछ। रातो चिन्ह उच्च जोखिम र पहेंलो चिन्ह सावधानीका संकेत हुन्।",
  },
  {
    emoji: "✉️",
    question: "म MigrantShield सहायतामा कसरी सम्पर्क गर्छु?",
    answer: (
      <>
        हामीलाई{" "}
        <a
          href="mailto:ravibist103@gmail.com"
          className="text-teal-500 underline hover:text-teal-400"
        >
          ravibist103@gmail.com
        </a>{" "}
        मा इमेल गर्नुहोस्। हामी ४८ घन्टाभित्र जवाफ दिने प्रयास गर्छौं। आपतकालमा
        आफ्नो नजिकको दूतावास वा श्रम विभागमा सम्पर्क गर्नुहोस्।
      </>
    ),
  },
];

export default function HelpPage() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "ne") setLang("ne");
  }, []);

  useEffect(() => {
    const sync = () => setLang((localStorage.getItem("lang") as Lang) ?? "en");
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  const faqs = lang === "ne" ? faqsNe : faqsEn;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "ne" ? "ड्यासबोर्ड" : "Dashboard"}</span>
          </Link>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 absolute left-1/2 -translate-x-1/2">
            {lang === "ne" ? "सहायता र FAQ" : "Help & FAQ"}
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {lang === "ne"
              ? "हामी कसरी मद्दत गर्न सक्छौं?"
              : "How Can We Help?"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === "ne"
              ? "तपाईंका अधिकार र MigrantShield कसरी काम गर्छ भन्ने सामान्य प्रश्नहरू।"
              : "Common questions about your rights and how MigrantShield works."}
          </p>
        </div>

        {/* FAQ Cards */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-0.5 shrink-0">{faq.emoji}</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                    {faq.question}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-8 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-5 py-5 text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {lang === "ne" ? "अझै सहायता चाहिन्छ?" : "Still need help?"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {lang === "ne"
              ? "हाम्रो टोली तपाईंका लागि यहाँ छ।"
              : "Our team is here for you."}
          </p>

          <a
            href="mailto:ravibist103@gmail.com"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            ✉️ Contact Support
          </a>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
