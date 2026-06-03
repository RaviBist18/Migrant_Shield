"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const faqs = [
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

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 absolute left-1/2 -translate-x-1/2">
            Help &amp; FAQ
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            How Can We Help?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Common questions about your rights and how MigrantShield works.
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
            Still need help?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Our team is here for you.
          </p>
          <a
            href="mailto:ravibist103@gmail.com"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            ✉️ Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
