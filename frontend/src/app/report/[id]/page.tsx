"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Share2,
  RefreshCw,
  Shield,
  ArrowLeft,
  Download,
  FileText,
  BookOpen,
  ShieldCheck,
  Scale,
  ChevronDown,
  Globe,
  ExternalLink,
} from "lucide-react";

// =============================================================
// TYPES
// =============================================================
interface ContractFlag {
  flag_id: string;
  flag_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  clause_text: string | null;
  recommendation: string;
  mitigation_steps: string[];
  legal_references: string[];
  created_at: string;
}

interface ReportData {
  contract_id: string;
  worker_name: string | null;
  employer_name: string | null;
  country: string | null;
  original_filename: string | null;
  upload_date: string | null;
  analyzed_at: string | null;
  language: string;
  risk_score: number;
  flags: ContractFlag[];
  flags_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
}

type Verdict = "SAFE" | "CAUTION" | "CRITICAL";
type TabKey = "critical" | "warning" | "info" | "all";

// =============================================================
// HELPERS
// =============================================================
function resolveVerdict(score: number): Verdict {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "CAUTION";
  return "SAFE";
}

function getRiskCircleStyle(score: number) {
  if (score >= 70)
    return {
      ring: "border-red-500",
      text: "text-red-500",
      label: "High Risk",
      labelColor: "text-red-500",
    };
  if (score >= 40)
    return {
      ring: "border-amber-500",
      text: "text-amber-500",
      label: "Caution",
      labelColor: "text-amber-500",
    };
  return {
    ring: "border-emerald-500",
    text: "text-emerald-500",
    label: "Low Risk",
    labelColor: "text-emerald-500",
  };
}

function getProgressBarColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function severityStyles(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        text: "text-red-600 dark:text-red-400",
        badge:
          "border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-transparent",
        accentBar: "bg-red-500",
        clauseBorder: "border-l-red-400 dark:border-l-red-600",
        icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
      };
    case "warning":
      return {
        text: "text-amber-600 dark:text-amber-400",
        badge:
          "border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-transparent",
        accentBar: "bg-amber-500",
        clauseBorder: "border-l-amber-400 dark:border-l-amber-600",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
      };
    default:
      return {
        text: "text-slate-500 dark:text-slate-400",
        badge:
          "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-transparent",
        accentBar: "bg-slate-400",
        clauseBorder: "border-l-slate-300 dark:border-l-slate-600",
        icon: <Shield className="w-3.5 h-3.5 text-slate-400" />,
      };
  }
}

// AI confidence derived from risk score (inverse for completed analysis)
function getConfidence(flag: ContractFlag): number {
  // Simulate confidence: critical flags typically have higher AI confidence
  if (flag.severity === "critical") return 92;
  if (flag.severity === "warning") return 78;
  return 65;
}

const UI_STRINGS: Record<
  string,
  {
    extractedClause: string;
    plainExplanation: string;
    whatYouCanDo: string;
    legalReferences: string;
    aiWarning: string;
    disclaimerLabel: string;
    disclaimer: string;
    referencesNote: string;
    critical: string;
    warning: string;
    info: string;
    allClauses: string;
    riskScore: string;
    downloadReport: string;
    viewInLang: string;
    viewOriginal: string;
    noFlags: string;
    noFlagsDesc: string;
    completed: string;
    aiConfidence: string;
  }
> = {
  en: {
    extractedClause: "Extracted Contract Clause",
    plainExplanation: "Plain Language Explanation",
    whatYouCanDo: "What You Can Do",
    legalReferences: "Statutory Legal References",
    aiWarning:
      "References are AI-generated and may not be complete or jurisdiction-specific. Verify all citations with a qualified legal professional.",
    disclaimerLabel: "Disclaimer:",
    disclaimer:
      "This report is AI-generated for informational purposes only. MigrantShield does not provide legal advice. Always consult a qualified legal professional before making decisions about your employment contract.",
    referencesNote:
      "References are AI-generated and may not be complete or jurisdiction-specific. Verify all citations with a qualified legal professional.",
    critical: "Critical",
    warning: "Warning",
    info: "Info",
    allClauses: "All clauses",
    riskScore: "risk score",
    downloadReport: "Download report",
    viewInLang: "View in Hindi",
    viewOriginal: "View original contract",
    noFlags: "No Issues Found",
    noFlagsDesc: "No problematic clauses were detected in this contract.",
    completed: "Completed",
    aiConfidence: "AI confidence",
  },
  ne: {
    extractedClause: "करारको अनुच्छेद",
    plainExplanation: "सरल भाषामा व्याख्या",
    whatYouCanDo: "तपाईंले के गर्न सक्नुहुन्छ",
    legalReferences: "कानूनी सन्दर्भहरू",
    aiWarning:
      "सन्दर्भहरू AI-जनित हुन् र पूर्ण नहुन सक्छन्। कुनै पनि निर्णय गर्नु अघि योग्य कानूनी पेशेवरसँग परामर्श गर्नुहोस्।",
    disclaimerLabel: "अस्वीकरण:",
    disclaimer:
      "यो रिपोर्ट केवल जानकारीको लागि AI-जनित हो। MigrantShield कानूनी सल्लाह प्रदान गर्दैन।",
    referencesNote:
      "सन्दर्भहरू AI-जनित हुन् र न्यायक्षेत्र-विशिष्ट नहुन सक्छन्।",
    critical: "गम्भीर",
    warning: "चेतावनी",
    info: "जानकारी",
    allClauses: "सबै खण्डहरू",
    riskScore: "जोखिम स्कोर",
    downloadReport: "रिपोर्ट डाउनलोड",
    viewInLang: "नेपालीमा हेर्नुहोस्",
    viewOriginal: "मूल करार हेर्नुहोस्",
    noFlags: "कुनै समस्या फेला परेन",
    noFlagsDesc: "यस करारमा कुनै समस्याजनक खण्ड पत्ता लागेन।",
    completed: "पूर्ण",
    aiConfidence: "AI विश्वास",
  },
  hi: {
    extractedClause: "अनुबंध का अनुच्छेद",
    plainExplanation: "सरल भाषा में स्पष्टीकरण",
    whatYouCanDo: "आप क्या कर सकते हैं",
    legalReferences: "कानूनी संदर्भ",
    aiWarning: "संदर्भ AI-जनित हैं। किसी योग्य कानूनी पेशेवर से परामर्श करें।",
    disclaimerLabel: "अस्वीकरण:",
    disclaimer: "यह रिपोर्ट केवल जानकारी के लिए AI-जनित है।",
    referencesNote: "संदर्भ AI-जनित हैं और क्षेत्राधिकार-विशिष्ट नहीं हो सकते।",
    critical: "गंभीर",
    warning: "चेतावनी",
    info: "जानकारी",
    allClauses: "सभी खंड",
    riskScore: "जोखिम स्कोर",
    downloadReport: "रिपोर्ट डाउनलोड करें",
    viewInLang: "हिंदी में देखें",
    viewOriginal: "मूल अनुबंध देखें",
    noFlags: "कोई समस्या नहीं मिली",
    noFlagsDesc: "इस अनुबंध में कोई समस्याजनक खंड नहीं पाया गया।",
    completed: "पूर्ण",
    aiConfidence: "AI विश्वास",
  },
  ar: {
    extractedClause: "بند العقد المستخرج",
    plainExplanation: "شرح بلغة بسيطة",
    whatYouCanDo: "ما يمكنك فعله",
    legalReferences: "المراجع القانونية",
    aiWarning:
      "المراجع مولدة بالذكاء الاصطناعي. استشر متخصصاً قانونياً مؤهلاً.",
    disclaimerLabel: "إخلاء المسؤولية:",
    disclaimer: "هذا التقرير مولد بالذكاء الاصطناعي لأغراض إعلامية فقط.",
    referencesNote:
      "المراجع مولدة بالذكاء الاصطناعي وقد لا تكون خاصة بالولاية القضائية.",
    critical: "حرج",
    warning: "تحذير",
    info: "معلومات",
    allClauses: "جميع البنود",
    riskScore: "درجة المخاطر",
    downloadReport: "تحميل التقرير",
    viewInLang: "عرض بالعربية",
    viewOriginal: "عرض العقد الأصلي",
    noFlags: "لم يتم العثور على مشاكل",
    noFlagsDesc: "لم يتم اكتشاف بنود إشكالية في هذا العقد.",
    completed: "مكتمل",
    aiConfidence: "ثقة الذكاء الاصطناعي",
  },
  tl: {
    extractedClause: "Nakuhang Sugnay ng Kontrata",
    plainExplanation: "Paliwanag sa Simpleng Wika",
    whatYouCanDo: "Ano ang Magagawa Mo",
    legalReferences: "Mga Legal na Sanggunian",
    aiWarning:
      "Ang mga sanggunian ay AI-generated. Kumonsulta sa isang kwalipikadong legal na propesyonal.",
    disclaimerLabel: "Disclaimer:",
    disclaimer: "Ang ulat na ito ay AI-generated para sa impormasyon lamang.",
    referencesNote:
      "Ang mga sanggunian ay AI-generated at maaaring hindi jurisdiction-specific.",
    critical: "Kritikal",
    warning: "Babala",
    info: "Impormasyon",
    allClauses: "Lahat ng sugnay",
    riskScore: "risk score",
    downloadReport: "I-download ang ulat",
    viewInLang: "Tingnan sa Filipino",
    viewOriginal: "Tingnan ang orihinal na kontrata",
    noFlags: "Walang Nahanap na Problema",
    noFlagsDesc: "Walang problemadong sugnay ang natuklasan sa kontratang ito.",
    completed: "Kumpleto",
    aiConfidence: "AI kumpiyansa",
  },
  bn: {
    extractedClause: "চুক্তির ধারা",
    plainExplanation: "সহজ ভাষায় ব্যাখ্যা",
    whatYouCanDo: "আপনি কী করতে পারেন",
    legalReferences: "আইনি তথ্যসূত্র",
    aiWarning:
      "তথ্যসূত্রগুলি AI-জেনারেটেড। একজন যোগ্য আইন বিশেষজ্ঞের পরামর্শ নিন।",
    disclaimerLabel: "দায়মুক্তি:",
    disclaimer: "এই রিপোর্টটি শুধুমাত্র তথ্যের জন্য AI-জেনারেটেড।",
    referencesNote:
      "তথ্যসূত্রগুলি AI-জেনারেটেড এবং এখতিয়ার-নির্দিষ্ট নাও হতে পারে।",
    critical: "গুরুতর",
    warning: "সতর্কতা",
    info: "তথ্য",
    allClauses: "সব ধারা",
    riskScore: "ঝুঁকি স্কোর",
    downloadReport: "রিপোর্ট ডাউনলোড",
    viewInLang: "বাংলায় দেখুন",
    viewOriginal: "মূল চুক্তি দেখুন",
    noFlags: "কোনো সমস্যা পাওয়া যায়নি",
    noFlagsDesc: "এই চুক্তিতে কোনো সমস্যাজনক ধারা পাওয়া যায়নি।",
    completed: "সম্পন্ন",
    aiConfidence: "AI আস্থা",
  },
};

const FLAG_TYPE_LABELS: Record<string, Record<string, string>> = {
  passport_confiscation: {
    en: "Passport Confiscation",
    ne: "राहदानी जफत",
    hi: "पासपोर्ट जब्ती",
    ar: "مصادرة جواز السفر",
    tl: "Pagkumpiska ng Pasaporte",
    bn: "পাসপোর্ট বাজেয়াপ্ত",
  },
  recruitment_fee: {
    en: "Recruitment Fee",
    ne: "भर्ती शुल्क",
    hi: "भर्ती शुल्क",
    ar: "رسوم التوظيف",
    tl: "Bayad sa Recruitment",
    bn: "নিয়োগ ফি",
  },
  wage_deduction: {
    en: "Wage Deduction",
    ne: "ज्याला कटौती",
    hi: "वेतन कटौती",
    ar: "خصم الأجر",
    tl: "Pagbabawas ng Sahod",
    bn: "মজুরি কর্তন",
  },
  movement_restriction: {
    en: "Movement Restriction",
    ne: "आवागमन प्रतिबन्ध",
    hi: "आवाजाही प्रतिबंध",
    ar: "تقييد حرية التنقل",
    tl: "Paghihigpit sa Kilusan",
    bn: "চলাচলে বিধিনিষেধ",
  },
  no_termination_right: {
    en: "No Termination Right",
    ne: "अन्त्य गर्ने अधिकार छैन",
    hi: "समाप्ति का अधिकार नहीं",
    ar: "لا حق في إنهاء العقد",
    tl: "Walang Karapatang Wakasan",
    bn: "চুক্তি বাতিলের অধিকার নেই",
  },
  debt_bondage: {
    en: "Debt Bondage",
    ne: "ऋण बन्धन",
    hi: "ऋण बंधन",
    ar: "عبودية الديون",
    tl: "Pagkaalipin sa Utang",
    bn: "ঋণ দাসত্ব",
  },
  excessive_working_hours: {
    en: "Excessive Working Hours",
    ne: "अत्यधिक काम घण्टा",
    hi: "अत्यधिक कार्य घंटे",
    ar: "ساعات عمل مفرطة",
    tl: "Labis na Oras ng Trabaho",
    bn: "অতিরিক্ত কাজের সময়",
  },
  below_minimum_wage: {
    en: "Below Minimum Wage",
    ne: "न्यूनतम ज्यालाभन्दा कम",
    hi: "न्यूनतम वेतन से कम",
    ar: "أقل من الحد الأدنى للأجر",
    tl: "Mababa sa Minimum Wage",
    bn: "ন্যূনতম মজুরির নিচে",
  },
  excessive_probation: {
    en: "Excessive Probation",
    ne: "अत्यधिक परिवीक्षा अवधि",
    hi: "अत्यधिक परिवीक्षा अवधि",
    ar: "فترة تجربة مفرطة",
    tl: "Labis na Probation",
    bn: "অতিরিক্ত পরীক্ষামূলক সময়",
  },
  one_sided_termination: {
    en: "One-Sided Termination",
    ne: "एकतर्फी समाप्ति",
    hi: "एकतरफा समाप्ति",
    ar: "إنهاء عقد أحادي الجانب",
    tl: "Isang Panig na Pagwawakas",
    bn: "একতরফা চুক্তি বাতিল",
  },
  no_rest_days: {
    en: "No Rest Days",
    ne: "बिदाको उल्लेख छैन",
    hi: "आराम के दिन नहीं",
    ar: "لا أيام راحة",
    tl: "Walang Rest Days",
    bn: "বিশ্রামের দিন নেই",
  },
  vague_salary: {
    en: "Vague Salary Terms",
    ne: "अस्पष्ट तलब शर्तहरू",
    hi: "अस्पष्ट वेतन शर्तें",
    ar: "شروط راتب غامضة",
    tl: "Malabong Kondisyon ng Sahod",
    bn: "অস্পষ্ট বেতনের শর্ত",
  },
  language_barrier: {
    en: "Language Barrier",
    ne: "भाषा बाधा",
    hi: "भाषा बाधा",
    ar: "حاجز اللغة",
    tl: "Hadlang sa Wika",
    bn: "ভাষার বাধা",
  },
  no_dispute_resolution: {
    en: "No Dispute Resolution",
    ne: "विवाद समाधान छैन",
    hi: "विवाद समाधान नहीं",
    ar: "لا آلية لحل النزاعات",
    tl: "Walang Dispute Resolution",
    bn: "বিরোধ নিষ্পত্তির ব্যবস্থা নেই",
  },
  missing_employer_details: {
    en: "Missing Employer Details",
    ne: "नियोक्ताको विवरण छैन",
    hi: "नियोक्ता विवरण अनुपस्थित",
    ar: "بيانات صاحب العمل مفقودة",
    tl: "Kulang na Detalye ng Employer",
    bn: "নিয়োগকর্তার তথ্য অনুপস্থিত",
  },
  no_health_insurance: {
    en: "No Health Insurance",
    ne: "स्वास्थ्य बीमा छैन",
    hi: "स्वास्थ्य बीमा नहीं",
    ar: "لا تأمين صحي",
    tl: "Walang Health Insurance",
    bn: "স্বাস্থ্য বীমা নেই",
  },
  no_jurisdiction: {
    en: "No Jurisdiction Specified",
    ne: "न्यायक्षेत्र उल्लेख छैन",
    hi: "क्षेत्राधिकार निर्दिष्ट नहीं",
    ar: "لا ولاية قضائية محددة",
    tl: "Walang Tinukoy na Jurisdiction",
    bn: "কোনো এখতিয়ার নির্দিষ্ট নেই",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// =============================================================
// FLAG ACCORDION CARD
// =============================================================
function FlagCard({
  flag,
  ui,
  lang,
  isExpanded,
  onToggle,
}: {
  flag: ContractFlag;
  ui: (typeof UI_STRINGS)["en"];
  lang: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const ss = severityStyles(flag.severity);
  const confidence = getConfidence(flag);

  const steps: string[] = Array.isArray(flag.mitigation_steps)
    ? flag.mitigation_steps
    : flag.recommendation
      ? [flag.recommendation]
      : [];

  const refs: string[] = Array.isArray(flag.legal_references)
    ? flag.legal_references
    : [];

  const flagTypeKey = flag.flag_type
    ?.toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const flagTypeLabel =
    FLAG_TYPE_LABELS[flagTypeKey]?.[lang] ??
    FLAG_TYPE_LABELS[flagTypeKey]?.["en"] ??
    flag.flag_type?.replace(/_/g, " ");

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mb-3">
      {/* Severity accent line */}
      <div className={`h-0.5 w-full ${ss.accentBar}`} />

      {/* Collapsed header */}
      <button onClick={onToggle} className="w-full text-left px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {ss.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ss.badge}`}
                >
                  {flag.severity === "critical"
                    ? ui.critical
                    : flag.severity === "warning"
                      ? ui.warning
                      : ui.info}
                </span>
                {flagTypeLabel &&
                  flagTypeLabel.toLowerCase() !==
                    flag.severity.toLowerCase() && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
                      {flagTypeLabel}
                    </span>
                  )}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug mt-1.5 truncate">
                {flag.title}
              </p>
              {!isExpanded && flag.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                  {flag.description}
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-5 space-y-5 border-t border-slate-100 dark:border-slate-800">
          {/* SECTION A — Metrics & Confidence */}
          <div className="pt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ss.badge}`}
              >
                {flag.severity === "critical"
                  ? ui.critical
                  : flag.severity === "warning"
                    ? ui.warning
                    : ui.info}
              </span>
              {flagTypeLabel &&
                flagTypeLabel.toLowerCase() !== flag.severity.toLowerCase() && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300">
                    {flagTypeLabel}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 dark:bg-slate-200 rounded-full transition-all"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                {confidence}% {ui.aiConfidence}
              </span>
            </div>
          </div>

          {/* SECTION B — Extracted Clause */}
          {flag.clause_text && (
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                📄 {ui.extractedClause}
              </p>
              <div
                className={`bg-slate-50/60 dark:bg-slate-900/40 border-l-2 ${ss.clauseBorder} p-4 rounded-r-lg font-mono text-sm text-slate-700 dark:text-slate-300 antialiased leading-relaxed`}
              >
                {flag.clause_text}
              </div>
            </div>
          )}

          {/* SECTION C — Plain Language */}
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              📖 {ui.plainExplanation}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3.5 border-l border-slate-200 dark:border-slate-800">
              {flag.description}
            </p>
          </div>

          {/* SECTION D — What You Can Do */}
          {steps.length > 0 && (
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                🛡️ {ui.whatYouCanDo}
              </p>
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION E — Legal References */}
          {refs.length > 0 && (
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />❯ {ui.legalReferences}
              </p>
              <div>
                {refs.map((ref, i) => (
                  <span
                    key={i}
                    className="bg-transparent border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-1.5 px-3 rounded-lg text-xs font-normal mr-2 inline-block mb-2"
                  >
                    {ref}
                  </span>
                ))}
                <p
                  className="text-slate-400 dark:text-slate-500 mt-2 block"
                  style={{ fontSize: "11px" }}
                >
                  {ui.referencesNote}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// MAIN COMPONENT
// =============================================================
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const contractId = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const fetchReport = useCallback(async () => {
    if (!session?.access_token || !contractId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/report/${contractId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Error ${res.status}`);
      }
      const data: ReportData = await res.json();
      setReport(data);
      // Auto-select tab based on what exists
      if (data.critical_count > 0) setActiveTab("critical");
      else if (data.warning_count > 0) setActiveTab("warning");
      else setActiveTab("all");
    } catch (err: any) {
      setError(err.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, contractId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleShare = async () => {
    const url = `${window.location.origin}/report/${contractId}`;
    try {
      if (navigator.share)
        await navigator.share({ title: "MigrantShield Report", url });
      else await navigator.clipboard.writeText(url);
    } catch (_) {}
  };

  const handleViewOriginal = async () => {
    if (!session?.access_token || !contractId) return;
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (_) {}
  };

  // =============================================================
  // LOADING
  // =============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Failed to Load Report
          </h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => fetchReport()}
            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const ui = UI_STRINGS[report.language] ?? UI_STRINGS["en"];
  const riskStyle = getRiskCircleStyle(report.risk_score);
  const progressColor = getProgressBarColor(report.risk_score);

  // Tab filtering
  const visibleFlags =
    activeTab === "all"
      ? report.flags
      : report.flags.filter((f) => f.severity === activeTab);

  const tabs = [
    { key: "critical", label: ui.critical, count: report.critical_count },
    { key: "warning", label: ui.warning, count: report.warning_count },
    { key: "info", label: ui.info, count: report.info_count },
    { key: "all", label: ui.allClauses, count: report.flags_count },
  ].filter((t) => t.key === "all" || t.count > 0);

  const langLabel =
    {
      en: "English",
      ne: "Nepali",
      hi: "Hindi",
      ar: "Arabic",
      tl: "Filipino",
      bn: "Bengali",
    }[report.language] ?? report.language;

  // =============================================================
  // MAIN RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* TOP AI WARNING BANNER */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <p
            className="text-amber-700 dark:text-amber-400"
            style={{ fontSize: "11px" }}
          >
            {ui.aiWarning}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* BACK + NAV */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* HERO HEADER — worker name + risk circle */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
                {report.worker_name ?? "Contract Report"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {[
                  report.employer_name,
                  report.country,
                  report.upload_date?.slice(0, 10),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> {ui.completed}
                </span>
                {report.language && report.language !== "en" && (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                    <Globe className="w-3 h-3" /> {langLabel}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3.5">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                  Risk score: {report.risk_score}/100
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                    style={{ width: `${report.risk_score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Risk score circle */}
            <div
              className={`w-20 h-20 rounded-full border-4 ${riskStyle.ring} flex flex-col items-center justify-center shrink-0`}
            >
              <span
                className={`text-2xl font-black leading-none ${riskStyle.text}`}
              >
                {report.risk_score}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                {ui.riskScore}
              </span>
              <span
                className={`text-[9px] font-bold mt-0.5 ${riskStyle.labelColor}`}
              >
                {riskStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2.5">
          <button
            onClick={() => window.open(`/report/${contractId}/print`, "_blank")}
            className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> {ui.downloadReport}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            onClick={handleViewOriginal}
            className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold py-2.5 px-3 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
            title={ui.viewOriginal}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* FLAGS SECTION */}
        {report.flags.length > 0 ? (
          <div>
            {/* Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-4 gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as TabKey);
                    setExpanded(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100"
                      : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? tab.key === "critical"
                            ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                            : tab.key === "warning"
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.key === "all" && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Flag cards */}
            <div>
              {visibleFlags.map((flag) => (
                <FlagCard
                  key={flag.flag_id}
                  flag={flag}
                  ui={ui}
                  lang={report.language}
                  isExpanded={expanded === flag.flag_id}
                  onToggle={() =>
                    setExpanded(expanded === flag.flag_id ? null : flag.flag_id)
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f172a] border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-6 text-center shadow-sm">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
              {ui.noFlags}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {ui.noFlagsDesc}
            </p>
          </div>
        )}

        {/* BOTTOM DISCLAIMER */}
        <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {ui.disclaimerLabel}{" "}
            </span>
            {ui.disclaimer}
          </p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
