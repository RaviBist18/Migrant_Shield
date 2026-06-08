"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
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
// HELPERS — IMAGE 1 (full report)
// =============================================================
function resolveVerdict(score: number): Verdict {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "CAUTION";
  return "SAFE";
}

function verdictStyles(verdict: Verdict) {
  switch (verdict) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        badge: "bg-red-100 text-red-700 border-red-200",
        bar: "bg-red-500",
        icon: <XCircle className="w-6 h-6 text-red-600" />,
        label: "High Risk",
      };
    case "CAUTION":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        bar: "bg-amber-400",
        icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        label: "Review Required",
      };
    case "SAFE":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        bar: "bg-emerald-400",
        icon: <CheckCircle className="w-6 h-6 text-emerald-600" />,
        label: "Looks Safe",
      };
  }
}

// =============================================================
// HELPERS — IMAGE 2 (compact view)
// =============================================================
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

// =============================================================
// SHARED SEVERITY STYLES
// =============================================================
function severityStylesFull(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        text: "text-red-600 dark:text-red-400",
        badge:
          "px-2 py-0.5 rounded-full text-xs font-medium border border-red-200 dark:border-red-800 bg-transparent text-red-600 dark:text-red-400",
        accent: "border-l-2 border-l-red-400 dark:border-l-red-600",
        clauseBorder: "border-l-red-400 dark:border-l-red-600",
        headerText: "text-slate-900 dark:text-slate-50",
        cardBg: "bg-white dark:bg-[#0f172a]",
      };
    case "warning":
      return {
        text: "text-amber-600 dark:text-amber-400",
        badge:
          "px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800 bg-transparent text-amber-600 dark:text-amber-400",
        accent: "border-l-2 border-l-amber-400 dark:border-l-amber-600",
        clauseBorder: "border-l-amber-400 dark:border-l-amber-600",
        headerText: "text-slate-900 dark:text-slate-50",
        cardBg: "bg-white dark:bg-[#0f172a]",
      };
    default:
      return {
        text: "text-slate-500 dark:text-slate-400",
        badge:
          "px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300",
        accent: "border-l-2 border-l-slate-300 dark:border-l-slate-600",
        clauseBorder: "border-l-slate-300 dark:border-l-slate-600",
        headerText: "text-slate-900 dark:text-slate-50",
        cardBg: "bg-white dark:bg-[#0f172a]",
      };
  }
}

function severityStylesCompact(severity: string) {
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

function getConfidence(flag: ContractFlag): number {
  if (flag.severity === "critical") return 92;
  if (flag.severity === "warning") return 78;
  return 65;
}

// =============================================================
// UI STRINGS
// =============================================================
const UI_STRINGS: Record<
  string,
  {
    extractedClause: string;
    plainExplanation: string;
    whatYouCanDo: string;
    legalReferences: string;
    noReferences: string;
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
    viewOriginal: string;
    noFlags: string;
    noFlagsDesc: string;
    completed: string;
    aiConfidence: string;
    chatTitle: string;
    chatSubtitle: string;
    chatPlaceholder: string;
    chatSend: string;
    chatWelcome: string;
    chatError: string;
    chatThinking: string;
    chatDisclaimer: string;
  }
> = {
  en: {
    extractedClause: "Extracted Contract Clause",
    plainExplanation: "Plain Language Explanation",
    whatYouCanDo: "What You Can Do",
    legalReferences: "Statutory Legal References",
    noReferences: "No specific legal references available for this flag.",
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
    downloadReport: "Download PDF",
    viewOriginal: "View original contract",
    noFlags: "No Issues Found",
    noFlagsDesc: "No problematic clauses were detected in this contract.",
    completed: "Completed",
    aiConfidence: "AI confidence",
    chatTitle: "Legal Assistant",
    chatSubtitle: "Ask about your contract",
    chatPlaceholder: "Ask a question about your contract...",
    chatSend: "Send",
    chatWelcome:
      "Hi! I've reviewed your contract analysis. Ask me anything about your rights or the flagged issues.",
    chatError: "Something went wrong. Please try again.",
    chatThinking: "Thinking...",
    chatDisclaimer: "AI assistant — not legal advice.",
  },
  ne: {
    extractedClause: "करारको अनुच्छेद",
    plainExplanation: "सरल भाषामा व्याख्या",
    whatYouCanDo: "तपाईंले के गर्न सक्नुहुन्छ",
    legalReferences: "कानूनी सन्दर्भहरू",
    noReferences: "यस समस्याको लागि कुनै कानूनी सन्दर्भ उपलब्ध छैन।",
    aiWarning:
      "सन्दर्भहरू AI-जनित हुन् र पूर्ण नहुन सक्छन्। कुनै पनि निर्णय गर्नु अघि योग्य कानूनी पेशेवरसँग परामर्श गर्नुहोस्।",
    disclaimerLabel: "अस्वीकरण:",
    disclaimer:
      "यो रिपोर्ट केवल जानकारीको लागि AI-जनित हो। MigrantShield कानूनी सल्लाह प्रदान गर्दैन। आफ्नो रोजगार करारबारे निर्णय गर्नु अघि योग्य कानूनी पेशेवरसँग परामर्श गर्नुहोस्।",
    referencesNote:
      "सन्दर्भहरू AI-जनित हुन् र न्यायक्षेत्र-विशिष्ट नहुन सक्छन्। सबै उद्धरणहरू योग्य कानूनी पेशेवरसँग प्रमाणित गर्नुहोस्।",
    critical: "गम्भीर",
    warning: "चेतावनी",
    info: "जानकारी",
    allClauses: "सबै खण्डहरू",
    riskScore: "जोखिम स्कोर",
    downloadReport: "रिपोर्ट डाउनलोड",
    viewOriginal: "मूल करार हेर्नुहोस्",
    noFlags: "कुनै समस्या फेला परेन",
    noFlagsDesc: "यस करारमा कुनै समस्याजनक खण्ड पत्ता लागेन।",
    completed: "पूर्ण",
    aiConfidence: "AI विश्वास",
    chatTitle: "कानूनी सहायक",
    chatSubtitle: "आफ्नो सम्झौताबारे सोध्नुहोस्",
    chatPlaceholder: "आफ्नो सम्झौताबारे प्रश्न सोध्नुहोस्...",
    chatSend: "पठाउनुहोस्",
    chatWelcome:
      "नमस्ते! मैले तपाईंको सम्झौता विश्लेषण हेरेको छु। आफ्नो अधिकार वा चिन्हित समस्याहरूबारे जे सोध्नुहोस्।",
    chatError: "केही गडबडी भयो। कृपया पुनः प्रयास गर्नुहोस्।",
    chatThinking: "सोच्दैछु...",
    chatDisclaimer: "AI सहायक — कानूनी सल्लाह होइन।",
  },
  hi: {
    extractedClause: "अनुबंध का अनुच्छेद",
    plainExplanation: "सरल भाषा में स्पष्टीकरण",
    whatYouCanDo: "आप क्या कर सकते हैं",
    legalReferences: "कानूनी संदर्भ",
    noReferences: "इस समस्या के लिए कोई कानूनी संदर्भ उपलब्ध नहीं है।",
    aiWarning:
      "संदर्भ AI-जनित हैं और पूर्ण नहीं हो सकते। कोई भी निर्णय लेने से पहले किसी योग्य कानूनी पेशेवर से परामर्श करें।",
    disclaimerLabel: "अस्वीकरण:",
    disclaimer:
      "यह रिपोर्ट केवल जानकारी के लिए AI-जनित है। MigrantShield कानूनी सलाह नहीं देता। अपने रोजगार अनुबंध के बारे में निर्णय लेने से पहले किसी योग्य कानूनी पेशेवर से परामर्श करें।",
    referencesNote:
      "संदर्भ AI-जनित हैं और क्षेत्राधिकार-विशिष्ट नहीं हो सकते। सभी उद्धरण किसी योग्य कानूनी पेशेवर से सत्यापित करें।",
    critical: "गंभीर",
    warning: "चेतावनी",
    info: "जानकारी",
    allClauses: "सभी खंड",
    riskScore: "जोखिम स्कोर",
    downloadReport: "रिपोर्ट डाउनलोड करें",
    viewOriginal: "मूल अनुबंध देखें",
    noFlags: "कोई समस्या नहीं मिली",
    noFlagsDesc: "इस अनुबंध में कोई समस्याजनक खंड नहीं पाया गया।",
    completed: "पूर्ण",
    aiConfidence: "AI विश्वास",
    chatTitle: "कानूनी सहायक",
    chatSubtitle: "अपने अनुबंध के बारे में पूछें",
    chatPlaceholder: "अपने अनुबंध के बारे में प्रश्न पूछें...",
    chatSend: "भेजें",
    chatWelcome:
      "नमस्ते! मैंने आपके अनुबंध विश्लेषण की समीक्षा की है। अपने अधिकारों या चिन्हित समस्याओं के बारे में कुछ भी पूछें।",
    chatError: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
    chatThinking: "सोच रहा हूँ...",
    chatDisclaimer: "AI सहायक — कानूनी सलाह नहीं।",
  },
  ar: {
    extractedClause: "بند العقد المستخرج",
    plainExplanation: "شرح بلغة بسيطة",
    whatYouCanDo: "ما يمكنك فعله",
    legalReferences: "المراجع القانونية",
    noReferences: "لا توجد مراجع قانونية محددة لهذه المشكلة.",
    aiWarning:
      "المراجع مولدة بالذكاء الاصطناعي وقد لا تكون كاملة. استشر متخصصاً قانونياً مؤهلاً قبل اتخاذ أي قرار.",
    disclaimerLabel: "إخلاء المسؤولية:",
    disclaimer:
      "هذا التقرير مولد بالذكاء الاصطناعي لأغراض إعلامية فقط. لا تقدم MigrantShield مشورة قانونية. استشر متخصصاً قانونياً مؤهلاً قبل اتخاذ قرارات بشأن عقد عملك.",
    referencesNote:
      "المراجع مولدة بالذكاء الاصطناعي وقد لا تكون خاصة بالولاية القضائية. تحقق من جميع الاستشهادات مع متخصص قانوني مؤهل.",
    critical: "حرج",
    warning: "تحذير",
    info: "معلومات",
    allClauses: "جميع البنود",
    riskScore: "درجة المخاطر",
    downloadReport: "تحميل التقرير",
    viewOriginal: "عرض العقد الأصلي",
    noFlags: "لم يتم العثور على مشاكل",
    noFlagsDesc: "لم يتم اكتشاف بنود إشكالية في هذا العقد.",
    completed: "مكتمل",
    aiConfidence: "ثقة الذكاء الاصطناعي",
    chatTitle: "المساعد القانوني",
    chatSubtitle: "اسأل عن عقدك",
    chatPlaceholder: "اطرح سؤالاً حول عقدك...",
    chatSend: "إرسال",
    chatWelcome:
      "مرحباً! لقد راجعت تحليل عقدك. اسألني أي شيء عن حقوقك أو المشكلات المُكتشفة.",
    chatError: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    chatThinking: "أفكر...",
    chatDisclaimer: "مساعد ذكاء اصطناعي — ليس مشورة قانونية.",
  },
  tl: {
    extractedClause: "Nakuhang Sugnay ng Kontrata",
    plainExplanation: "Paliwanag sa Simpleng Wika",
    whatYouCanDo: "Ano ang Magagawa Mo",
    legalReferences: "Mga Legal na Sanggunian",
    noReferences: "Walang tiyak na legal na sanggunian para sa problemang ito.",
    aiWarning:
      "Ang mga sanggunian ay AI-generated at maaaring hindi kumpleto. Kumonsulta sa isang kwalipikadong legal na propesyonal bago gumawa ng desisyon.",
    disclaimerLabel: "Disclaimer:",
    disclaimer:
      "Ang ulat na ito ay AI-generated para sa impormasyon lamang. Hindi nagbibigay ng legal na payo ang MigrantShield. Kumonsulta sa isang kwalipikadong legal na propesyonal bago gumawa ng desisyon tungkol sa iyong kontrata.",
    referencesNote:
      "Ang mga sanggunian ay AI-generated at maaaring hindi jurisdiction-specific. I-verify ang lahat ng citations sa isang kwalipikadong legal na propesyonal.",
    critical: "Kritikal",
    warning: "Babala",
    info: "Impormasyon",
    allClauses: "Lahat ng sugnay",
    riskScore: "risk score",
    downloadReport: "I-download ang ulat",
    viewOriginal: "Tingnan ang orihinal na kontrata",
    noFlags: "Walang Nahanap na Problema",
    noFlagsDesc: "Walang problemadong sugnay ang natuklasan sa kontratang ito.",
    completed: "Kumpleto",
    aiConfidence: "AI kumpiyansa",
    chatTitle: "Legal Assistant",
    chatSubtitle: "Magtanong tungkol sa iyong kontrata",
    chatPlaceholder: "Magtanong tungkol sa iyong kontrata...",
    chatSend: "Ipadala",
    chatWelcome:
      "Kamusta! Sinuri ko ang iyong kontrata. Magtanong tungkol sa iyong mga karapatan o mga natuklasang isyu.",
    chatError: "May nangyaring mali. Pakisubukang muli.",
    chatThinking: "Nag-iisip...",
    chatDisclaimer: "AI assistant — hindi legal na payo.",
  },
  bn: {
    extractedClause: "চুক্তির ধারা",
    plainExplanation: "সহজ ভাষায় ব্যাখ্যা",
    whatYouCanDo: "আপনি কী করতে পারেন",
    legalReferences: "আইনি তথ্যসূত্র",
    noReferences: "এই সমস্যার জন্য কোনো নির্দিষ্ট আইনি তথ্যসূত্র নেই।",
    aiWarning:
      "তথ্যসূত্রগুলি AI-জেনারেটেড এবং সম্পূর্ণ নাও হতে পারে। কোনো সিদ্ধান্ত নেওয়ার আগে একজন যোগ্য আইন বিশেষজ্ঞের পরামর্শ নিন।",
    disclaimerLabel: "দায়মুক্তি:",
    disclaimer:
      "এই রিপোর্টটি শুধুমাত্র তথ্যের জন্য AI-জেনারেটেড। MigrantShield আইনি পরামর্শ প্রদান করে না। আপনার কর্মসংস্থান চুক্তি সম্পর্কে সিদ্ধান্ত নেওয়ার আগে একজন যোগ্য আইন বিশেষজ্ঞের পরামর্শ নিন।",
    referencesNote:
      "তথ্যসূত্রগুলি AI-জেনারেটেড এবং এখতিয়ার-নির্দিষ্ট নাও হতে পারে। সকল উদ্ধৃতি একজন যোগ্য আইন বিশেষজ্ঞের সাথে যাচাই করুন.",
    critical: "গুরুতর",
    warning: "সতর্কতা",
    info: "তথ্য",
    allClauses: "সব ধারা",
    riskScore: "ঝুঁকি স্কোর",
    downloadReport: "রিপোর্ট ডাউনলোড",
    viewOriginal: "মূল চুক্তি দেখুন",
    noFlags: "কোনো সমস্যা পাওয়া যায়নি",
    noFlagsDesc: "এই চুক্তিতে কোনো সমস্যাজনক ধারা পাওয়া যায়নি।",
    completed: "সম্পন্ন",
    aiConfidence: "AI আস্থা",
    chatTitle: "আইনি সহকারী",
    chatSubtitle: "আপনার চুক্তি সম্পর্কে জিজ্ঞেস করুন",
    chatPlaceholder: "আপনার চুক্তি সম্পর্কে প্রশ্ন করুন...",
    chatSend: "পাঠান",
    chatWelcome:
      "হ্যালো! আমি আপনার চুক্তি বিশ্লেষণ পর্যালোচনা করেছি। আপনার অধিকার বা চিহ্নিত সমস্যা সম্পর্কে যেকোনো কিছু জিজ্ঞেস করুন।",
    chatError: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
    chatThinking: "ভাবছি...",
    chatDisclaimer: "AI সহকারী — আইনি পরামর্শ নয়।",
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
  deportation_threat: {
    en: "Deportation Threat",
    ne: "निष्कासनको धम्की",
    hi: "निर्वासन की धमकी",
    ar: "التهديد بالترحيل",
    tl: "Banta ng Deportasyon",
    bn: "বহিষ্কারের হুমকি",
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
  excessive_notice_period: {
    en: "Excessive Notice Period",
    ne: "अत्यधिक सूचना अवधि",
    hi: "अत्यधिक नोटिस अवधि",
    ar: "فترة إشعار مفرطة",
    tl: "Labis na Notice Period",
    bn: "অতিরিক্ত নোটিশ সময়",
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
  auto_renewal: {
    en: "Automatic Renewal",
    ne: "स्वचालित नवीकरण",
    hi: "स्वचालित नवीनीकरण",
    ar: "تجديد تلقائي",
    tl: "Awtomatikong Renewal",
    bn: "স্বয়ংক্রিয় নবায়ন",
  },
  resignation_penalty: {
    en: "Resignation Penalty",
    ne: "राजीनामा जरिवाना",
    hi: "इस्तीफा दंड",
    ar: "غرامة الاستقالة",
    tl: "Parusa sa Pagbibitiw",
    bn: "পদত্যাগের জরিমানা",
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
// CHAT WIDGET
// =============================================================
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ChatWidget({
  contractId,
  token,
  ui,
  lang,
  autoOpen = false,
  flags = [],
}: {
  contractId: string;
  token: string;
  ui: (typeof UI_STRINGS)["en"];
  lang: string;
  autoOpen?: boolean;
  flags?: ContractFlag[];
}) {
  const [open, setOpen] = useState(autoOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: ui.chatWelcome },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);

  const FOLLOWUP_POOL =
    lang === "ne"
      ? [
          "यसबारे थप जानकारी दिनुहोस्",
          "म यसको बारेमा के गर्न सक्छु?",
          "के यो कानूनी छ?",
          "मलाई कुन कागजात चाहिन्छ?",
          "म कसलाई सम्पर्क गर्न सक्छु?",
          "यसको सजाय के हो?",
          "के म उजुरी दिन सक्छु?",
          "यो कति सामान्य छ?",
          "मेरो नियोक्ताले के गर्न सक्छ?",
          "म आफूलाई कसरी जोगाउन सक्छु?",
        ]
      : [
          "Can you explain that in more detail?",
          "What should I do about this?",
          "Is this legal in my destination country?",
          "What documents do I need for this?",
          "Who can I contact for help?",
          "What are the penalties for this violation?",
          "Can I file a complaint?",
          "How common is this issue?",
          "What can my employer legally do?",
          "How can I protect myself?",
        ];

  function getFollowups(offset: number): string[] {
    const start = (offset * 3) % FOLLOWUP_POOL.length;
    return [
      FOLLOWUP_POOL[start % FOLLOWUP_POOL.length],
      FOLLOWUP_POOL[(start + 1) % FOLLOWUP_POOL.length],
      FOLLOWUP_POOL[(start + 2) % FOLLOWUP_POOL.length],
    ];
  }
  const isRTL = lang === "ar";
  const suggestedQuestions: string[] = (() => {
    const questions: string[] = [];
    const severities = flags.map((f) => f.severity);
    const types = flags.map((f) =>
      f.flag_type?.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_"),
    );

    if (types.includes("passport_confiscation"))
      questions.push(
        lang === "ne"
          ? "के नियोक्ताले मेरो राहदानी राख्न सक्छ?"
          : "Can my employer legally keep my passport?",
      );
    if (types.includes("recruitment_fee"))
      questions.push(
        lang === "ne"
          ? "के भर्ती शुल्क तिर्नु कानूनी छ?"
          : "Are recruitment fees legal?",
      );
    if (types.includes("excessive_working_hours"))
      questions.push(
        lang === "ne"
          ? "अत्यधिक काम घण्टाको बारेमा के गर्न सक्छु?"
          : "What can I do about excessive working hours?",
      );
    if (
      types.includes("wage_deduction") ||
      types.includes("below_minimum_wage")
    )
      questions.push(
        lang === "ne"
          ? "मेरो तलब कटौतीबारे के अधिकार छ?"
          : "What are my rights regarding wage deductions?",
      );
    if (
      types.includes("no_termination_right") ||
      types.includes("one_sided_termination")
    )
      questions.push(
        lang === "ne"
          ? "के म सम्झौता तोड्न सक्छु?"
          : "Can I legally exit this contract?",
      );
    if (severities.includes("critical"))
      questions.push(
        lang === "ne"
          ? "मेरो सम्झौतामा सबैभन्दा गम्भीर समस्या के हो?"
          : "What is the most serious issue in my contract?",
      );
    if (questions.length === 0)
      questions.push(
        lang === "ne"
          ? "मेरो सम्झौता सुरक्षित छ?"
          : "Is my contract safe to sign?",
      );

    // Fallback pool — always ensure 3
    const fallbacks =
      lang === "ne"
        ? [
            "मेरो सम्झौतामा सबैभन्दा गम्भीर समस्या के हो?",
            "के यो सम्झौता हस्ताक्षर गर्न सुरक्षित छ?",
            "मेरो कानूनी अधिकारहरू के हुन्?",
            "म विवादको अवस्थामा के गर्न सक्छु?",
          ]
        : [
            "What is the most serious issue in my contract?",
            "Is this contract safe to sign?",
            "What are my legal rights here?",
            "What should I do if there is a dispute?",
          ];

    for (const f of fallbacks) {
      if (questions.length >= 3) break;
      if (!questions.includes(f)) questions.push(f);
    }

    return questions.slice(0, 3);
  })();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const DEFAULT_POS = { right: 16, bottom: 144 };
  const [panelPos, setPanelPos] = useState(DEFAULT_POS);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const targetRight = Math.max(
        8,
        window.innerWidth - clientX - dragOffset.current.x,
      );
      const targetBottom = Math.max(
        8,
        window.innerHeight - clientY - dragOffset.current.y,
      );
      setPanelPos((prev) => ({
        right: prev.right + (targetRight - prev.right) * 0.2,
        bottom: prev.bottom + (targetBottom - prev.bottom) * 0.2,
      }));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: window.innerWidth - clientX - rect.right + rect.left,
      y: window.innerHeight - clientY - rect.bottom + rect.top,
    };
    setDragging(true);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setFollowupQuestions([]);

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = messages.filter(
      (m) => m.role !== "assistant" || messages.indexOf(m) > 0,
    );
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/report/${contractId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-10),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
      setFollowupQuestions(getFollowups(messages.length));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: ui.chatError },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() =>
          setOpen((o) => {
            if (o) setPanelPos(DEFAULT_POS);
            return !o;
          })
        }
        className="fixed bottom-16 right-5 z-[60] w-14 h-14 bg-slate-900 hover:bg-slate-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95"
        aria-label="Open legal assistant"
      >
        {open ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
              stroke="white"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M17 18H27M17 23H31M17 28H24"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {!open && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
            {messages.filter((m) => m.role === "assistant").length - 1}
          </span>
        )}
      </button>

      {/* CHAT PANEL */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            height: "460px",
            right: panelPos.right,
            bottom: panelPos.bottom,
            cursor: dragging ? "grabbing" : "grab",
            transition: dragging ? "none" : "right 0.15s, bottom 0.15s",
          }}
          dir={isRTL ? "rtl" : "ltr"}
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          {/* HEADER */}
          <div
            className="bg-slate-900 dark:bg-slate-800 px-4 py-3 flex items-center gap-3 shrink-0 select-none"
            style={{ cursor: "inherit" }}
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 18H27M17 23H31M17 28H24"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">
                {ui.chatTitle}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {ui.chatSubtitle}
              </p>
            </div>
            <button
              onClick={() =>
                setMessages([{ role: "assistant", content: ui.chatWelcome }])
              }
              className="text-slate-400 hover:text-white transition-colors text-xs px-2 py-0.5 rounded-lg hover:bg-slate-700 shrink-0"
              title="Clear chat"
            >
              ↺
            </button>
            <div
              className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
              title="Online"
            />
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50 dark:bg-slate-950/40">
            {false &&
              messages.length === 1 &&
              suggestedQuestions.length > 0 && (
                <div className="px-1 pt-1 pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-2 pl-1">
                    Suggested
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          setMessages((prev) => [
                            ...prev,
                            { role: "user", content: q },
                          ]);
                          setLoading(true);
                          try {
                            const res = await fetch(
                              `${API_BASE}/report/${contractId}/chat`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  message: q,
                                  history: [],
                                }),
                              },
                            );
                            const data = await res.json();
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: data.answer },
                            ]);
                          } catch {
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: ui.chatError },
                            ]);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-center text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all leading-relaxed font-medium"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0 mb-0.5">
                    <svg width="10" height="10" viewBox="0 0 48 48" fill="none">
                      <path
                        d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-br-sm"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm"
                  }`}
                  style={{ wordBreak: "break-word" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && suggestedQuestions.length > 0 && (
              <div className="px-1 pt-1 pb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-2 pl-1">
                  Suggested
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        setMessages((prev) => [
                          ...prev,
                          { role: "user", content: q },
                        ]);
                        setLoading(true);
                        try {
                          const res = await fetch(
                            `${API_BASE}/report/${contractId}/chat`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ message: q, history: [] }),
                            },
                          );
                          const data = await res.json();
                          setMessages((prev) => [
                            ...prev,
                            { role: "assistant", content: data.answer },
                          ]);
                          setFollowupQuestions(getFollowups(messages.length));
                        } catch {
                          setMessages((prev) => [
                            ...prev,
                            { role: "assistant", content: ui.chatError },
                          ]);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-center text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all leading-relaxed font-medium"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!loading &&
              followupQuestions.length > 0 &&
              messages.length > 1 && (
                <div className="px-1 pt-1 pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-2 pl-1">
                    Continue
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {followupQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          setFollowupQuestions([]);
                          setMessages((prev) => [
                            ...prev,
                            { role: "user", content: q },
                          ]);
                          setLoading(true);
                          try {
                            const res = await fetch(
                              `${API_BASE}/report/${contractId}/chat`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  message: q,
                                  history: messages.slice(-10).map((m) => ({
                                    role: m.role,
                                    content: m.content,
                                  })),
                                }),
                              },
                            );
                            const data = await res.json();
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: data.answer },
                            ]);
                            setFollowupQuestions(getFollowups(messages.length));
                          } catch {
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: ui.chatError },
                            ]);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-center text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all leading-relaxed font-medium"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* DISCLAIMER */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <p
              className="text-slate-400 dark:text-slate-500 text-center"
              style={{ fontSize: "10px" }}
            >
              ⚖️ {ui.chatDisclaimer}
            </p>
          </div>

          {/* INPUT */}
          <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={ui.chatPlaceholder}
                rows={1}
                maxLength={500}
                disabled={loading}
                className="flex-1 resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all leading-relaxed disabled:opacity-50"
                style={{ maxHeight: "100px", overflowY: "auto" }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================
// COMPACT FLAG CARD (image 2)
// =============================================================
function CompactFlagCard({
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
  const ss = severityStylesCompact(flag.severity);
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
      <div className={`h-0.5 w-full ${ss.accentBar}`} />
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
                  flagTypeLabel.toLowerCase() !== flag.severity.toLowerCase() &&
                  flagTypeLabel.toLowerCase() !== ui.critical.toLowerCase() &&
                  flagTypeLabel.toLowerCase() !== ui.warning.toLowerCase() &&
                  flagTypeLabel.toLowerCase() !== ui.info.toLowerCase() && (
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

      {isExpanded && (
        <div className="px-4 pb-5 space-y-5 border-t border-slate-100 dark:border-slate-800">
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
                flagTypeLabel.toLowerCase() !== flag.severity.toLowerCase() &&
                flagTypeLabel.toLowerCase() !== ui.critical.toLowerCase() &&
                flagTypeLabel.toLowerCase() !== ui.warning.toLowerCase() &&
                flagTypeLabel.toLowerCase() !== ui.info.toLowerCase() && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300">
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

          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              📖 {ui.plainExplanation}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3.5 border-l border-slate-200 dark:border-slate-800">
              {flag.description}
            </p>
          </div>

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
// INNER COMPONENT (needs useSearchParams — wrapped in Suspense)
// =============================================================
function ReportPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompact = searchParams.get("view") === "compact";
  const chatAutoOpen = searchParams.get("chat") === "open";

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

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

  const handleDownloadPdf = () => {
    window.open(`/report/${contractId}/print`, "_blank");
  };

  const handleShare = async () => {
    // Always share clean URL without ?view=compact
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
  // LOADING / ERROR STATES
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

  // =============================================================
  // COMPACT VIEW (image 2) — from history / dashboard
  // =============================================================
  if (isCompact) {
    const riskStyle = getRiskCircleStyle(report.risk_score);
    const progressColor = getProgressBarColor(report.risk_score);

    const tabs = [
      { key: "critical", label: ui.critical, count: report.critical_count },
      { key: "warning", label: ui.warning, count: report.warning_count },
      { key: "info", label: ui.info, count: report.info_count },
      { key: "all", label: ui.allClauses, count: report.flags_count },
    ].filter((t) => t.key === "all" || t.count > 0);

    const visibleFlags =
      activeTab === "all"
        ? report.flags
        : report.flags.filter((f) => f.severity === activeTab);

    const langLabel =
      {
        en: "English",
        ne: "Nepali",
        hi: "Hindi",
        ar: "Arabic",
        tl: "Filipino",
        bn: "Bengali",
      }[report.language] ?? report.language;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* HERO HEADER */}
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
                <div className="mt-3.5">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                    {ui.riskScore}: {report.risk_score}/100
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                      style={{ width: `${report.risk_score}%` }}
                    />
                  </div>
                </div>
              </div>
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

          {/* TOAST */}
          {pdfToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
              {pdfToast}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
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

          {/* TABS + FLAG CARDS */}
          {report.flags.length > 0 ? (
            <div>
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
              <div>
                {visibleFlags.map((flag) => (
                  <CompactFlagCard
                    key={flag.flag_id}
                    flag={flag}
                    ui={ui}
                    lang={report.language}
                    isExpanded={expanded === flag.flag_id}
                    onToggle={() =>
                      setExpanded(
                        expanded === flag.flag_id ? null : flag.flag_id,
                      )
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

          <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {ui.disclaimerLabel}{" "}
              </span>
              {ui.disclaimer}
            </p>
          </div>
          {session?.access_token && (
            <ChatWidget
              contractId={contractId}
              token={session.access_token}
              ui={ui}
              lang={report.language}
              autoOpen={chatAutoOpen}
              flags={report.flags}
            />
          )}
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // =============================================================
  // FULL VIEW (image 1) — after analysis / direct link
  // =============================================================
  const verdict = resolveVerdict(report.risk_score);
  const vs = verdictStyles(verdict);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 mt-1.5" style={{ fontSize: "11px" }}>
            {ui.aiWarning}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold text-slate-900">
              Contract Risk Report
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono break-all">
            ID: {contractId}
          </p>
          {report.analyzed_at && (
            <p className="text-xs text-slate-400 mt-0.5">
              Analysed: {new Date(report.analyzed_at).toLocaleString()}
            </p>
          )}
        </div>

        {(report.worker_name || report.employer_name || report.country) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            {report.worker_name && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Worker</span>
                <span className="text-slate-800 font-medium">
                  {report.worker_name}
                </span>
              </div>
            )}
            {report.employer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Employer</span>
                <span className="text-slate-800 font-medium">
                  {report.employer_name}
                </span>
              </div>
            )}
            {report.country && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Country</span>
                <span className="text-slate-800 font-medium">
                  {report.country}
                </span>
              </div>
            )}
            {report.original_filename && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">File</span>
                <span className="text-slate-600 font-mono text-xs truncate max-w-[60%]">
                  {report.original_filename}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={`rounded-xl border ${vs.bg} ${vs.border} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {vs.icon}
              <span
                className={`text-sm font-bold uppercase tracking-wide ${vs.text}`}
              >
                {vs.label}
              </span>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${vs.badge}`}
            >
              {verdict}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className={`text-5xl font-black ${vs.text}`}>
              {report.risk_score}
            </span>
            <span className="text-slate-400 text-sm mb-2">/ 100</span>
          </div>
          <div className="w-full bg-white rounded-full h-2.5 border border-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${vs.bar}`}
              style={{ width: `${report.risk_score}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              {
                label: ui.critical,
                count: report.critical_count,
                style: "bg-red-100 text-red-700 border-red-200",
              },
              {
                label: ui.warning,
                count: report.warning_count,
                style: "bg-amber-100 text-amber-700 border-amber-200",
              },
              {
                label: ui.info,
                count: report.info_count,
                style: "bg-slate-100 text-slate-700 border-slate-200",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-lg border text-center py-2 px-1 ${s.style}`}
              >
                <div className="text-xl font-black">{s.count}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {pdfToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
            {pdfToast}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> Save as PDF
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share Report
          </button>
        </div>

        {report.flags.length > 0 ? (
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Risk Flags ({report.flags_count})
            </h2>
            <div className="space-y-3">
              {report.flags.map((flag) => {
                const ss = severityStylesFull(flag.severity);
                const isExpanded = expanded === flag.flag_id;

                const steps: string[] = Array.isArray(flag.mitigation_steps)
                  ? flag.mitigation_steps
                  : flag.recommendation
                    ? [flag.recommendation]
                    : [];

                const refs: string[] = Array.isArray(flag.legal_references)
                  ? flag.legal_references
                  : [];

                return (
                  <div
                    key={flag.flag_id}
                    className={`rounded-xl border border-slate-200 dark:border-slate-800 ${ss.cardBg} ${ss.accent} shadow-sm overflow-hidden mb-4`}
                  >
                    <button
                      onClick={() =>
                        setExpanded(isExpanded ? null : flag.flag_id)
                      }
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <AlertTriangle
                              className={`w-3.5 h-3.5 ${ss.text}`}
                            />
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${ss.badge}`}
                            >
                              {flag.severity === "critical"
                                ? ui.critical.toUpperCase()
                                : flag.severity === "warning"
                                  ? ui.warning.toUpperCase()
                                  : ui.info.toUpperCase()}
                            </span>
                            {flag.flag_type &&
                              flag.flag_type.toLowerCase() !==
                                flag.severity.toLowerCase() && (
                                <span className="text-xs text-slate-500 font-medium">
                                  {FLAG_TYPE_LABELS[
                                    flag.flag_type
                                      .toLowerCase()
                                      .replace(/\s+/g, "_")
                                      .replace(/-/g, "_")
                                  ]?.[report.language] ??
                                    FLAG_TYPE_LABELS[
                                      flag.flag_type
                                        .toLowerCase()
                                        .replace(/\s+/g, "_")
                                        .replace(/-/g, "_")
                                    ]?.["en"] ??
                                    flag.flag_type.replace(/_/g, " ")}
                                </span>
                              )}
                          </div>
                          <p
                            className={`text-sm font-bold leading-snug ${ss.headerText}`}
                          >
                            {flag.title}
                          </p>
                          {flag.description && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                              {flag.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        >
                          ▶
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-5 space-y-5 border-t border-slate-100 dark:border-slate-800">
                        {flag.clause_text && (
                          <div className="pt-4">
                            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              📄 {ui.extractedClause}
                            </p>
                            <div
                              className={`bg-slate-50/60 dark:bg-slate-900/40 border-l-2 ${ss.clauseBorder} p-4 rounded-r-lg font-mono text-sm text-slate-700 dark:text-slate-300 antialiased`}
                            >
                              {flag.clause_text}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            📖 {ui.plainExplanation}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3.5 border-l border-slate-200 dark:border-slate-800">
                            {flag.description}
                          </p>
                        </div>

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
                                  <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {refs.length > 0 && (
                          <div>
                            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5" />❯{" "}
                              {ui.legalReferences}
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
              })}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-emerald-700 font-semibold text-sm">
              No Issues Found
            </p>
            <p className="text-emerald-600 text-xs mt-1">
              No problematic clauses were detected in this contract.
            </p>
          </div>
        )}

        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600">
              {ui.disclaimerLabel}{" "}
            </span>
            {ui.disclaimer}
          </p>
        </div>

        {session?.access_token && (
          <ChatWidget
            contractId={contractId}
            token={session.access_token}
            ui={ui}
            lang={report.language}
            autoOpen={chatAutoOpen}
            flags={report.flags}
          />
        )}
        <div className="h-8" />
      </div>
    </div>
  );
}

// =============================================================
// EXPORT — wrapped in Suspense for useSearchParams
// =============================================================
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
