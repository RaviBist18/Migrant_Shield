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
  MessageSquare,
  Info,
  ArrowRight,
  Check,
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

function verdictConfig(verdict: Verdict, ui: (typeof UI_STRINGS)["en"]) {
  switch (verdict) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        border: "border-red-100",
        scoreColor: "text-red-600",
        barColor: "bg-red-500",
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        label: "High Risk",
        dot: "bg-red-500",
      };
    case "CAUTION":
      return {
        bg: "bg-amber-50",
        border: "border-amber-100",
        scoreColor: "text-amber-600",
        barColor: "bg-amber-400",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-700",
        icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        label: "Review Required",
        dot: "bg-amber-400",
      };
    case "SAFE":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        scoreColor: "text-emerald-600",
        barColor: "bg-emerald-500",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-700",
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        label: "Looks Safe",
        dot: "bg-emerald-500",
      };
  }
}

function severityConfig(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        topBorder: "border-t-red-500",
        leftBorder: "border-l-red-400",
        clauseBorder: "border-l-red-300",
        badgeBg: "bg-red-50",
        badgeBorder: "border-red-200",
        badgeText: "text-red-700",
        iconColor: "text-red-500",
        icon: <XCircle className="w-4 h-4" />,
        label: "Critical",
        dotColor: "bg-red-500",
        sectionColor: "text-red-600",
      };
    case "warning":
      return {
        topBorder: "border-t-amber-400",
        leftBorder: "border-l-amber-400",
        clauseBorder: "border-l-amber-300",
        badgeBg: "bg-amber-50",
        badgeBorder: "border-amber-200",
        badgeText: "text-amber-700",
        iconColor: "text-amber-500",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: "Warning",
        dotColor: "bg-amber-400",
        sectionColor: "text-amber-600",
      };
    default:
      return {
        topBorder: "border-t-slate-300",
        leftBorder: "border-l-slate-300",
        clauseBorder: "border-l-slate-200",
        badgeBg: "bg-slate-50",
        badgeBorder: "border-slate-200",
        badgeText: "text-slate-600",
        iconColor: "text-slate-400",
        icon: <Info className="w-4 h-4" />,
        label: "Info",
        dotColor: "bg-slate-400",
        sectionColor: "text-slate-500",
      };
  }
}

function getConfidence(flag: ContractFlag): number {
  if (flag.severity === "critical") return 92;
  if (flag.severity === "warning") return 78;
  return 65;
}

function getRiskCircleStyle(score: number, ui: (typeof UI_STRINGS)["en"]) {
  if (score >= 70)
    return {
      ring: "border-red-500",
      text: "text-red-600",
      label: "High Risk",
      labelColor: "text-red-500",
    };
  if (score >= 40)
    return {
      ring: "border-amber-500",
      text: "text-amber-600",
      label: "Caution",
      labelColor: "text-amber-600",
    };
  return {
    ring: "border-emerald-500",
    text: "text-emerald-600",
    label: "Low Risk",
    labelColor: "text-emerald-600",
  };
}

function getProgressBarColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-emerald-500";
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
    verdictCritical: string;
    verdictCaution: string;
    verdictSafe: string;
    riskHigh: string;
    riskCaution: string;
    riskLow: string;
    back: string;
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
    riskScore: "Risk Score",
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
    verdictCritical: "High Risk",
    verdictCaution: "Review Required",
    verdictSafe: "Looks Safe",
    riskHigh: "High Risk",
    riskCaution: "Caution",
    riskLow: "Low Risk",
    back: "Back",
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
    verdictCritical: "उच्च जोखिम",
    verdictCaution: "समीक्षा आवश्यक",
    verdictSafe: "सुरक्षित देखिन्छ",
    riskHigh: "उच्च जोखिम",
    riskCaution: "सावधानी",
    riskLow: "कम जोखिम",
    back: "फिर्ता",
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
    verdictCritical: "उच्च जोखिम",
    verdictCaution: "समीक्षा आवश्यक",
    verdictSafe: "सुरक्षित दिखता है",
    riskHigh: "उच्च जोखिम",
    riskCaution: "सावधानी",
    riskLow: "कम जोखिम",
    back: "वापस",
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
    verdictCritical: "خطر مرتفع",
    verdictCaution: "يحتاج مراجعة",
    verdictSafe: "يبدو آمناً",
    riskHigh: "خطر مرتفع",
    riskCaution: "تنبيه",
    riskLow: "خطر منخفض",
    back: "العودة",
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
    riskScore: "Risk Score",
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
    verdictCritical: "Mataas na Panganib",
    verdictCaution: "Kailangang Suriin",
    verdictSafe: "Mukhang Ligtas",
    riskHigh: "Mataas na Panganib",
    riskCaution: "Mag-ingat",
    riskLow: "Mababang Panganib",
    back: "Bumalik",
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
      "তথ্যসূত্রগুলি AI-জেনারেটেড এবং এখতিয়ার-নির্দিষ্ট নাও হতে পারে। সকল উদ্ধৃতি একজন যোগ্য আইন বিশেষজ্ঞের সাথে যাচাই করুন।",
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
    verdictCritical: "উচ্চ ঝুঁকি",
    verdictCaution: "পর্যালোচনা প্রয়োজন",
    verdictSafe: "নিরাপদ মনে হচ্ছে",
    riskHigh: "উচ্চ ঝুঁকি",
    riskCaution: "সতর্কতা",
    riskLow: "কম ঝুঁকি",
    back: "ফিরে যান",
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

function formatMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <div key={i} className="flex items-start gap-2.5 my-1.5">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            {numberedMatch[1]}
          </span>
          <span className="text-sm leading-relaxed">{numberedMatch[2]}</span>
        </div>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={i} className="font-semibold mt-2 text-sm">
          {line.slice(2, -2)}
        </p>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="leading-relaxed text-sm">
        {line}
      </p>
    );
  });
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
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    if (open || autoOpen) return;
    const seenKey = `chat_widget_used_${contractId}`;
    if (sessionStorage.getItem(seenKey)) return;

    const showTimer = setTimeout(() => setShouldPulse(true), 6000);
    const hideTimer = setTimeout(() => setShouldPulse(false), 12000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [contractId]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: ui.chatWelcome },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);

  const FOLLOWUP_POOL_MAP: Record<string, string[]> = {
    en: [
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
    ],
    ne: [
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
    ],
    hi: [
      "क्या आप इसे विस्तार से समझा सकते हैं?",
      "मुझे इसके बारे में क्या करना चाहिए?",
      "क्या यह मेरे गंतव्य देश में कानूनी है?",
      "इसके लिए मुझे कौन से दस्तावेज़ चाहिए?",
      "मदद के लिए मैं किससे संपर्क कर सकता हूँ?",
      "इस उल्लंघन के लिए क्या दंड हैं?",
      "क्या मैं शिकायत दर्ज कर सकता हूँ?",
      "यह समस्या कितनी आम है?",
      "मेरा नियोक्ता कानूनी रूप से क्या कर सकता है?",
      "मैं खुद की सुरक्षा कैसे कर सकता हूँ?",
    ],
    ar: [
      "هل يمكنك شرح ذلك بمزيد من التفصيل؟",
      "ماذا يجب أن أفعل حيال هذا؟",
      "هل هذا قانوني في بلد وجهتي؟",
      "ما هي المستندات التي أحتاجها لهذا؟",
      "من يمكنني الاتصال به للمساعدة؟",
      "ما هي عقوبات هذا الانتهاك؟",
      "هل يمكنني تقديم شكوى؟",
      "ما مدى شيوع هذه المشكلة؟",
      "ماذا يمكن لصاحب العمل أن يفعل قانونيًا؟",
      "كيف يمكنني حماية نفسي؟",
    ],
    fil: [
      "Maaari mo bang ipaliwanag nang mas detalyado?",
      "Ano ang dapat kong gawin tungkol dito?",
      "Legal ba ito sa bansang pupuntahan ko?",
      "Anong mga dokumento ang kailangan ko para dito?",
      "Sino ang maaari kong kontakin para sa tulong?",
      "Ano ang mga parusa para sa paglabag na ito?",
      "Maaari ba akong maghain ng reklamo?",
      "Gaano karaniwan ang isyung ito?",
      "Ano ang legal na maaaring gawin ng aking employer?",
      "Paano ko mapoprotektahan ang aking sarili?",
    ],
    bn: [
      "আপনি কি এটি আরও বিস্তারিতভাবে ব্যাখ্যা করতে পারেন?",
      "আমার এই বিষয়ে কী করা উচিত?",
      "এটি কি আমার গন্তব্য দেশে বৈধ?",
      "এর জন্য আমার কোন কোন কাগজপত্র প্রয়োজন?",
      "সাহায্যের জন্য আমি কার সাথে যোগাযোগ করতে পারি?",
      "এই লঙ্ঘনের জন্য শাস্তি কী?",
      "আমি কি অভিযোগ দায়ের করতে পারি?",
      "এই সমস্যা কতটা সাধারণ?",
      "আমার নিয়োগকর্তা আইনগতভাবে কী করতে পারেন?",
      "আমি কীভাবে নিজেকে রক্ষা করতে পারি?",
    ],
  };
  FOLLOWUP_POOL_MAP.tl = FOLLOWUP_POOL_MAP.fil;
  const FOLLOWUP_POOL = FOLLOWUP_POOL_MAP[lang] || FOLLOWUP_POOL_MAP.en;

  function getFollowups(offset: number): string[] {
    const start = (offset * 3) % FOLLOWUP_POOL.length;
    return [
      FOLLOWUP_POOL[start % FOLLOWUP_POOL.length],
      FOLLOWUP_POOL[(start + 1) % FOLLOWUP_POOL.length],
      FOLLOWUP_POOL[(start + 2) % FOLLOWUP_POOL.length],
    ];
  }

  const isRTL = lang === "ar";

  const Q_MAP: Record<string, Record<string, string>> = {
    passport: {
      en: "Can my employer legally keep my passport?",
      ne: "के नियोक्ताले मेरो राहदानी राख्न सक्छ?",
      hi: "क्या मेरा नियोक्ता कानूनी रूप से मेरा पासपोर्ट रख सकता है?",
      ar: "هل يمكن لصاحب العمل الاحتفاظ بجواز سفري قانونيًا؟",
      fil: "Legal bang panatilihin ng aking employer ang aking pasaporte?",
      bn: "আমার নিয়োগকর্তা কি আইনগতভাবে আমার পাসপোর্ট রাখতে পারেন?",
    },
    recruitment: {
      en: "Are recruitment fees legal?",
      ne: "के भर्ती शुल्क तिर्नु कानूनी छ?",
      hi: "क्या भर्ती शुल्क लेना कानूनी है?",
      ar: "هل رسوم التوظيف قانونية؟",
      fil: "Legal ba ang mga bayarin sa pangangalap?",
      bn: "নিয়োগ ফি কি বৈধ?",
    },
    hours: {
      en: "What can I do about excessive working hours?",
      ne: "अत्यधिक काम घण्टाको बारेमा के गर्न सक्छु?",
      hi: "अत्यधिक काम के घंटों के बारे में मैं क्या कर सकता हूँ?",
      ar: "ماذا يمكنني أن أفعل حيال ساعات العمل المفرطة؟",
      fil: "Ano ang magagawa ko tungkol sa sobrang oras ng trabaho?",
      bn: "অতিরিক্ত কাজের সময় সম্পর্কে আমি কী করতে পারি?",
    },
    wage: {
      en: "What are my rights regarding wage deductions?",
      ne: "मेरो तलब कटौतीबारे के अधिकार छ?",
      hi: "वेतन कटौती के संबंध में मेरे क्या अधिकार हैं?",
      ar: "ما هي حقوقي فيما يتعلق باستقطاعات الأجور؟",
      fil: "Ano ang aking mga karapatan tungkol sa mga pagbawas sa sahod?",
      bn: "বেতন কর্তন সম্পর্কে আমার অধিকার কী?",
    },
    exit: {
      en: "Can I legally exit this contract?",
      ne: "के म सम्झौता तोड्न सक्छु?",
      hi: "क्या मैं कानूनी रूप से इस अनुबंध से बाहर निकल सकता हूँ?",
      ar: "هل يمكنني الخروج من هذا العقد قانونيًا؟",
      fil: "Maaari ko bang legal na iwanan ang kontratang ito?",
      bn: "আমি কি আইনগতভাবে এই চুক্তি থেকে বের হতে পারি?",
    },
    serious: {
      en: "What is the most serious issue in my contract?",
      ne: "मेरो सम्झौतामा सबैभन्दा गम्भीर समस्या के हो?",
      hi: "मेरे अनुबंध में सबसे गंभीर समस्या क्या है?",
      ar: "ما هي أخطر مشكلة في عقدي؟",
      fil: "Ano ang pinakaseryosong isyu sa aking kontrata?",
      bn: "আমার চুক্তিতে সবচেয়ে গুরুতর সমস্যা কী?",
    },
    safe: {
      en: "Is my contract safe to sign?",
      ne: "मेरो सम्झौता सुरक्षित छ?",
      hi: "क्या मेरा अनुबंध हस्ताक्षर करने के लिए सुरक्षित है?",
      ar: "هل عقدي آمن للتوقيع؟",
      fil: "Ligtas bang pirmahan ang aking kontrata?",
      bn: "আমার চুক্তি স্বাক্ষর করা কি নিরাপদ?",
    },
    safe2: {
      en: "Is this contract safe to sign?",
      ne: "के यो सम्झौता हस्ताक्षर गर्न सुरक्षित छ?",
      hi: "क्या यह अनुबंध हस्ताक्षर करने के लिए सुरक्षित है?",
      ar: "هل هذا العقد آمن للتوقيع؟",
      fil: "Ligtas ba ang kontratang ito na pirmahan?",
      bn: "এই চুক্তি স্বাক্ষর করা কি নিরাপদ?",
    },
    rights: {
      en: "What are my legal rights here?",
      ne: "मेरो कानूनी अधिकारहरू के हुन्?",
      hi: "यहाँ मेरे कानूनी अधिकार क्या हैं?",
      ar: "ما هي حقوقي القانونية هنا؟",
      fil: "Ano ang aking mga legal na karapatan dito?",
      bn: "এখানে আমার আইনি অধিকার কী?",
    },
    dispute: {
      en: "What should I do if there is a dispute?",
      ne: "म विवादको अवस्थामा के गर्न सक्छु?",
      hi: "विवाद होने पर मुझे क्या करना चाहिए?",
      ar: "ماذا يجب أن أفعل في حالة وجود نزاع؟",
      fil: "Ano ang dapat kong gawin kung may hindi pagkakaunawaan?",
      bn: "বিরোধ হলে আমার কী করা উচিত?",
    },
  };
  for (const k of Object.keys(Q_MAP)) {
    Q_MAP[k].tl = Q_MAP[k].fil;
  }
  const qt = (key: string) => Q_MAP[key][lang] || Q_MAP[key].en;

  const suggestedQuestions: string[] = (() => {
    const questions: string[] = [];
    const severities = flags.map((f) => f.severity);
    const types = flags.map((f) =>
      f.flag_type?.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_"),
    );
    if (types.includes("passport_confiscation")) questions.push(qt("passport"));
    if (types.includes("recruitment_fee")) questions.push(qt("recruitment"));
    if (types.includes("excessive_working_hours")) questions.push(qt("hours"));
    if (
      types.includes("wage_deduction") ||
      types.includes("below_minimum_wage")
    )
      questions.push(qt("wage"));
    if (
      types.includes("no_termination_right") ||
      types.includes("one_sided_termination")
    )
      questions.push(qt("exit"));
    if (severities.includes("critical")) questions.push(qt("serious"));
    if (questions.length === 0) questions.push(qt("safe"));

    const fallbacks = [qt("serious"), qt("safe2"), qt("rights"), qt("dispute")];
    for (const f of fallbacks) {
      if (questions.length >= 3) break;
      if (!questions.includes(f)) questions.push(f);
    }
    return questions.slice(0, 3);
  })();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, right: 0, bottom: 0 });
  const DEFAULT_POS = { right: 16, bottom: 144 };
  const [panelPos, setPanelPos] = useState(DEFAULT_POS);
  const [dragging, setDragging] = useState(false);
  const [panelHeight, setPanelHeight] = useState(480);
  const resizing = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);
  const [panelWidth, setPanelWidth] = useState(352);
  const resizingW = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const resizingRight = useRef(false);
  const resizeStartXR = useRef(0);
  const resizeStartWR = useRef(0);
  const resizeStartRightPos = useRef(0);

  const resizingBottom = useRef(false);
  const resizeStartYB = useRef(0);
  const resizeStartHB = useRef(0);
  const resizeStartBottomPos = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (resizing.current) {
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const delta = resizeStartY.current - clientY;
        const newH = Math.min(700, Math.max(320, resizeStartH.current + delta));
        setPanelHeight(newH);
        return;
      }
      if (resizingW.current) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const delta = resizeStartX.current - clientX;
        const newW = Math.min(
          Math.min(700, window.innerWidth - 32),
          Math.max(300, resizeStartW.current + delta),
        );
        setPanelWidth(newW);
        return;
      }
      if (resizingRight.current) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const delta = clientX - resizeStartXR.current;
        const newW = Math.min(
          Math.min(700, window.innerWidth - 32),
          Math.max(300, resizeStartWR.current + delta),
        );
        const widthDelta = newW - resizeStartWR.current;
        setPanelWidth(newW);
        setPanelPos((p) => ({
          ...p,
          right: Math.max(8, resizeStartRightPos.current - widthDelta),
        }));
        return;
      }
      if (resizingBottom.current) {
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const delta = clientY - resizeStartYB.current;
        const newH = Math.min(
          700,
          Math.max(320, resizeStartHB.current + delta),
        );
        const heightDelta = newH - resizeStartHB.current;
        setPanelHeight(newH);
        setPanelPos((p) => ({
          ...p,
          bottom: Math.max(8, resizeStartBottomPos.current - heightDelta),
        }));
        return;
      }
      if (!dragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const newRight = Math.max(
        8,
        Math.min(
          window.innerWidth - 200,
          dragStart.current.right - (clientX - dragStart.current.mouseX),
        ),
      );
      const newBottom = Math.max(
        8,
        Math.min(
          window.innerHeight - 100,
          dragStart.current.bottom - (clientY - dragStart.current.mouseY),
        ),
      );
      setPanelPos({ right: newRight, bottom: newBottom });
    };
    const onUp = () => {
      setDragging(false);
      resizing.current = false;
      resizingW.current = false;
      resizingRight.current = false;
      resizingBottom.current = false;
    };
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
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      right: panelPos.right,
      bottom: panelPos.bottom,
    };
    setDragging(true);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStartY.current = e.clientY;
    resizeStartH.current = panelHeight;
  };
  const onResizeStartW = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingW.current = true;
    resizeStartX.current = e.clientX;
    resizeStartW.current = panelWidth;
  };
  const onResizeStartRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRight.current = true;
    resizeStartXR.current = e.clientX;
    resizeStartWR.current = panelWidth;
    resizeStartRightPos.current = panelPos.right;
  };

  const onResizeStartBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingBottom.current = true;
    resizeStartYB.current = e.clientY;
    resizeStartHB.current = panelHeight;
    resizeStartBottomPos.current = panelPos.bottom;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage(text: string, history: ChatMessage[]) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/report/${contractId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history: history.slice(-10) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
      setFollowupQuestions(getFollowups(history.length));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: ui.chatError },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setFollowupQuestions([]);
    const history = messages.filter(
      (m) => m.role !== "assistant" || messages.indexOf(m) > 0,
    );
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    await sendMessage(text, history);
  }

  async function handleSuggestion(q: string) {
    setFollowupQuestions([]);
    const history = messages.filter(
      (m) => m.role !== "assistant" || messages.indexOf(m) > 0,
    );
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    await sendMessage(q, history);
  }

  function copyMessage(content: string, index: number) {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function copyAll() {
    const text = messages
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function SuggestedList({
    questions,
  }: {
    questions: string[];
    label?: string;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(q)}
            className="text-left text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm transition-all leading-relaxed font-medium"
          >
            {q}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* FAB */}
      <>
        {!open && (
          <div className="fixed bottom-[86px] right-5 z-[60] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-[220px]">
            {ui.chatTitle} — {ui.chatSubtitle}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
          </div>
        )}
        {shouldPulse && !open && (
          <>
            <span className="fixed bottom-16 right-5 z-[58] w-14 h-14 rounded-full bg-teal-400/50 animate-ping pointer-events-none" />
            <span
              className="fixed bottom-16 right-5 z-[58] w-14 h-14 rounded-full bg-teal-400/30 animate-ping pointer-events-none"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
        <button
          onClick={() => {
            setShouldPulse(false);
            sessionStorage.setItem(`chat_widget_used_${contractId}`, "1");
            setOpen((o) => {
              if (o) setPanelPos(DEFAULT_POS);
              return !o;
            });
          }}
          className={`fixed bottom-16 right-5 z-[60] w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
            shouldPulse
              ? "ring-4 ring-teal-400 shadow-teal-400/50 shadow-xl animate-[bounce_1.5s_ease-in-out_3]"
              : "ring-1 ring-slate-700"
          }`}
          aria-label="Open legal assistant"
        >
          {open ? (
            <svg
              width="18"
              height="18"
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
            <MessageSquare className="w-5 h-5" />
          )}
          {!open && messages.length > 1 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
              {messages.filter((m) => m.role === "assistant").length - 1}
            </span>
          )}
        </button>
      </>

      {/* PANEL */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            height: `${panelHeight}px`,
            width: `${panelWidth}px`,
            right: panelPos.right,
            bottom: panelPos.bottom,
            transition: dragging ? "none" : "right 0.15s, bottom 0.15s",
          }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* RESIZE */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
            onMouseDown={onResizeStart}
          >
            <div className="mx-auto mt-0.5 w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300 dark:group-hover:bg-slate-500 transition-colors" />
          </div>

          <div
            className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize z-10 group"
            onMouseDown={onResizeStartW}
          >
            <div className="my-auto mt-[50%] ml-0.5 w-1 h-8 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300 dark:group-hover:bg-slate-500 transition-colors" />
          </div>
          <div
            className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize z-10 group"
            onMouseDown={onResizeStartRight}
          >
            <div className="my-auto mt-[50%] ml-auto mr-0.5 w-1 h-8 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300 dark:group-hover:bg-slate-500 transition-colors" />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
            onMouseDown={onResizeStartBottom}
          >
            <div className="mx-auto mb-0.5 w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300 dark:group-hover:bg-slate-500 transition-colors" />
          </div>

          {/* HEADER */}
          <div
            className="bg-slate-900 dark:bg-slate-800 px-4 py-3.5 flex items-center gap-3 shrink-0 select-none mt-1"
            style={{ cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">
                {ui.chatTitle}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {ui.chatSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  setMessages([{ role: "assistant", content: ui.chatWelcome }])
                }
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                title="Clear chat"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                </svg>
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={copyAll}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                title={copiedAll ? "Copied!" : "Copy all"}
              >
                {copiedAll ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => router.push(`/report/${contractId}/chat`)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                title="Open full page"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[82%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${msg.role === "user" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm"}`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {msg.role === "assistant" ? (
                      formatMessage(msg.content)
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "assistant" && i > 0 && (
                    <button
                      onClick={() => copyMessage(msg.content, i)}
                      className="self-start flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1"
                    >
                      {copiedIndex === i ? (
                        <>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && suggestedQuestions.length > 0 && (
              <div className="pt-1 pb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-2 pl-1">
                  Suggested
                </p>
                <SuggestedList questions={suggestedQuestions} />
              </div>
            )}

            {!loading &&
              followupQuestions.length > 0 &&
              messages.length > 1 && (
                <div className="pt-1 pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-2 pl-1">
                    Continue
                  </p>
                  <SuggestedList questions={followupQuestions} />
                </div>
              )}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
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
                className="flex-1 resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all disabled:opacity-50"
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
// SHARE MODAL (shared by both views)
// =============================================================
function ShareModal({
  shareUrl,
  shareCopied,
  shareRevoked,
  onCopy,
  onRevoke,
  onClose,
}: {
  shareUrl: string;
  shareCopied: boolean;
  shareRevoked: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        padding: "1rem",
      }}
    >
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-slate-900 dark:bg-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-4 h-4 text-white" />
            <p className="text-white text-sm font-semibold">Share Report</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {shareRevoked ? (
            <div className="text-center py-6">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                Link revoked
              </p>
              <p className="text-slate-400 text-xs mt-1">
                This share link is no longer active.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Share link · valid 30 days
                </p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                  <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono truncate">
                    {shareUrl}
                  </p>
                  <button
                    onClick={onCopy}
                    className="shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {shareCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const t = encodeURIComponent(
                      `MigrantShield Contract Report: ${shareUrl}`,
                    );
                    window.open(`https://wa.me/?text=${t}`, "_blank");
                  }}
                  className="bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    const t = encodeURIComponent(
                      `MigrantShield Contract Report: ${shareUrl}`,
                    );
                    window.open(`viber://forward?text=${t}`, "_blank");
                  }}
                  className="bg-[#7360f2] hover:bg-[#5b4ac4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.03 4.453.36 7.34.286 10.943c-.073 3.601-.16 10.348 6.333 12.168h.006l-.006 2.789s-.042.812.504.977c.657.2 1.047-.425 1.677-1.109.347-.373.825-.92 1.186-1.337 3.27.275 5.784-.353 6.072-.446.66-.214 4.397-.693 5.005-5.655.627-5.109-.305-8.334-1.97-9.789l-.001-.002c-.483-.435-2.42-1.856-6.218-2.077a18.703 18.703 0 0 0-1.476-.46z" />
                  </svg>
                  Viber
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=181374994990&redirect_uri=${encodeURIComponent(shareUrl)}`,
                      "_blank",
                    )
                  }
                  className="bg-[#0084ff] hover:bg-[#006ed4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
                  </svg>
                  Messenger
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "MigrantShield Report",
                        url: shareUrl,
                      });
                    } else {
                      window.open(
                        `sms:?body=${encodeURIComponent(`MigrantShield Contract Report: ${shareUrl}`)}`,
                        "_blank",
                      );
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  More / SMS
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No login required to view.
                </p>
                <button
                  onClick={onRevoke}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Revoke link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// FLAG CARD — COMPACT VIEW
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
  const sc = severityConfig(flag.severity);
  const confidence = getConfidence(flag);
  function normalizeForCompare(s: string) {
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  // word-overlap similarity check — catches near-dup, not just exact match
  function isSimilar(a: string, b: string, threshold = 0.6) {
    const wordsA = new Set(
      normalizeForCompare(a)
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
    const wordsB = new Set(
      normalizeForCompare(b)
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let overlap = 0;
    wordsA.forEach((w) => {
      if (wordsB.has(w)) overlap++;
    });
    const ratio = overlap / Math.min(wordsA.size, wordsB.size);
    return ratio >= threshold;
  }

  let explanationPoints: string[] = flag.description
    ? flag.description
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // dedupe near-identical sentences within description itself
  explanationPoints = explanationPoints.filter(
    (point, idx) =>
      !explanationPoints.slice(0, idx).some((prev) => isSimilar(prev, point)),
  );

  // need min 2 distinct points — if backend gave only 1, try clause-split as last resort.
  // if still <2, show single point as-is (no fake content manufactured) and flag it for review.
  let explanationIncomplete = false;
  if (explanationPoints.length < 2) {
    const commaSplit = (flag.description || "")
      .split(/,\s+(?=[a-z\u0900-\u097F])/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (commaSplit.length >= 2 && !isSimilar(commaSplit[0], commaSplit[1])) {
      explanationPoints = commaSplit;
    } else {
      explanationIncomplete = true;
    }
  }

  const explanationNorms = new Set(explanationPoints.map(normalizeForCompare));

  const steps: string[] = (
    Array.isArray(flag.mitigation_steps)
      ? flag.mitigation_steps
      : flag.recommendation
        ? [flag.recommendation]
        : []
  ).filter(
    (step) =>
      !explanationNorms.has(normalizeForCompare(step)) &&
      !explanationPoints.some((point) => isSimilar(point, step)),
  );
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
  const severityLabel =
    flag.severity === "critical"
      ? ui.critical
      : flag.severity === "warning"
        ? ui.warning
        : ui.info;

  return (
    <div
      className={`bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mb-3 border-t-2 ${sc.topBorder}`}
    >
      <button onClick={onToggle} className="w-full text-left px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className={`mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center ${sc.iconColor}`}
            >
              {sc.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${sc.badgeBg} ${sc.badgeBorder} ${sc.badgeText}`}
                >
                  {severityLabel}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">
                {flag.title}
              </p>
              {!isExpanded && flag.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {flag.description}
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 mt-1 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* CONFIDENCE ROW */}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${sc.badgeBg} ${sc.badgeBorder} ${sc.badgeText}`}
              >
                {severityLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 dark:bg-slate-200 rounded-full"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                {confidence}% {ui.aiConfidence}
              </span>
            </div>
          </div>

          <div className="px-4 py-4 space-y-5">
            {flag.clause_text && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" /> {ui.extractedClause}
                </p>
                <div
                  className={`border-l-2 ${sc.clauseBorder} bg-slate-50 dark:bg-slate-900/40 px-4 py-3 rounded-r-lg`}
                >
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {flag.clause_text}
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5" /> {ui.plainExplanation}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {flag.description}
              </p>
            </div>

            {steps.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" /> {ui.whatYouCanDo}
                </p>
                <div className="space-y-2.5">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-300" />
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
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                  <Scale className="w-3.5 h-3.5" /> {ui.legalReferences}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {refs.map((ref, i) => (
                    <span
                      key={i}
                      className="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-1 px-3 rounded-lg text-xs"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-[11px]">
                  {ui.referencesNote}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// FLAG CARD — FULL VIEW
// =============================================================
function FullFlagCard({
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
  const sc = severityConfig(flag.severity);
  const confidence = getConfidence(flag);
  const steps: string[] = Array.isArray(flag.mitigation_steps)
    ? flag.mitigation_steps
    : flag.recommendation
      ? [flag.recommendation]
      : [];
  console.log(
    "DEBUG mitigation_steps:",
    flag.title,
    typeof flag.mitigation_steps,
    flag.mitigation_steps,
    "isArray:",
    Array.isArray(flag.mitigation_steps),
  );
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
  const severityLabel =
    flag.severity === "critical"
      ? ui.critical
      : flag.severity === "warning"
        ? ui.warning
        : ui.info;

  return (
    <div
      className={`bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm border-t-2 ${sc.topBorder}`}
    >
      <button onClick={onToggle} className="w-full text-left px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className={`mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center ${sc.iconColor}`}
            >
              {sc.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${sc.badgeBg} ${sc.badgeBorder} ${sc.badgeText}`}
                >
                  {severityLabel}
                </span>
                {flagTypeLabel &&
                  flagTypeLabel.toLowerCase() !== severityLabel.toLowerCase() &&
                  flagTypeLabel.toLowerCase() !==
                    flag.severity.toLowerCase() && (
                    <span className="text-xs text-slate-400 font-medium">
                      {flagTypeLabel}
                    </span>
                  )}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">
                {flag.title}
              </p>
              {flag.description && !isExpanded && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {flag.description}
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* CONFIDENCE */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${sc.badgeBg} ${sc.badgeBorder} ${sc.badgeText}`}
              >
                {severityLabel}
              </span>
              {flagTypeLabel &&
                flagTypeLabel.toLowerCase() !== flag.severity.toLowerCase() && (
                  <span className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                    {flagTypeLabel}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 dark:bg-slate-300 rounded-full transition-all"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                {confidence}% {ui.aiConfidence}
              </span>
            </div>
          </div>

          <div className="px-5 py-5 space-y-6">
            {flag.clause_text && (
              <div>
                <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />{" "}
                  {ui.extractedClause}
                </p>
                <div
                  className={`border-l-2 ${sc.clauseBorder} bg-slate-50 dark:bg-slate-900/40 px-4 py-3.5 rounded-r-lg`}
                >
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {flag.clause_text}
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />{" "}
                {ui.plainExplanation}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {flag.description}
              </p>
            </div>

            {steps.length > 0 && (
              <div>
                <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />{" "}
                  {ui.whatYouCanDo}
                </p>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-500" />
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
                <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
                  <Scale className="w-3.5 h-3.5 text-amber-500" />{" "}
                  {ui.legalReferences}
                </p>
                <div className="flex flex-wrap gap-2">
                  {refs.map((ref, i) => (
                    <span
                      key={i}
                      className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 py-1.5 px-3 rounded-lg text-xs font-medium"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// NEW: SEVERITY-GROUPED FLAG SECTION (img1-style shell)
// =============================================================

function severitySectionStyle(severity: "critical" | "warning" | "info") {
  switch (severity) {
    case "critical":
      return {
        borderL: "border-l-red-500",
        headerBg: "bg-red-50 dark:bg-red-950/20",
        icon: <XCircle size={18} className="text-red-600" />,
        itemBorder: "border-red-200 dark:border-red-900/40",
        bulletText: "text-red-500",
      };
    case "warning":
      return {
        borderL: "border-l-amber-500",
        headerBg: "bg-amber-50 dark:bg-amber-950/20",
        icon: <AlertTriangle size={18} className="text-amber-600" />,
        itemBorder: "border-amber-200 dark:border-amber-900/40",
        bulletText: "text-amber-500",
      };
    default:
      return {
        borderL: "border-l-slate-400",
        headerBg: "bg-slate-50 dark:bg-slate-900",
        icon: <Info size={18} className="text-slate-500" />,
        itemBorder: "border-slate-200 dark:border-slate-800",
        bulletText: "text-slate-400",
      };
  }
}

function FlagSeveritySection({
  severity,
  label,
  count,
  defaultOpen,
  children,
}: {
  severity: "critical" | "warning" | "info";
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const s = severitySectionStyle(severity);

  return (
    <div
      className={`border border-slate-200 dark:border-slate-800 border-l-4 ${s.borderL} rounded-xl overflow-hidden mb-4`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full ${s.headerBg} px-5 py-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-left`}
      >
        {s.icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex-1">
          {label}
          <span className="ml-2 text-slate-400 font-semibold">({count})</span>
        </h3>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="bg-white dark:bg-slate-900 px-5 py-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function FlagBulletItem({
  flag,
  ui,
  isExpanded,
  onToggle,
}: {
  flag: ContractFlag;
  ui: (typeof UI_STRINGS)["en"];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const s = severitySectionStyle(flag.severity);
  const confidence = getConfidence(flag);
  function normalizeSteps(raw: unknown, fallback: string): string[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as string[];
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return [raw];
      }
    }
    return fallback ? [fallback] : [];
  }
  const steps: string[] = normalizeSteps(
    flag.mitigation_steps,
    flag.recommendation,
  );
  const refs: string[] = Array.isArray(flag.legal_references)
    ? flag.legal_references
    : [];

  let explanationPoints: string[] = flag.description
    ? flag.description
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // fallback: backend gave only 1 sentence — split on comma-clauses to get 2 points minimum
  if (explanationPoints.length === 1) {
    const commaSplit = explanationPoints[0]
      .split(/,\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (commaSplit.length >= 2) {
      explanationPoints = commaSplit;
    }
  }

  function normalizeForCompare(s: string) {
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
  }
  const explanationNorms = new Set(explanationPoints.map(normalizeForCompare));

  return (
    <div
      className={`bg-white dark:bg-[#0f172a] border ${s.itemBorder} rounded-lg overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className={`mt-0.5 shrink-0 ${s.bulletText}`}>{s.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-snug">
            {flag.title}
          </p>
          {!isExpanded && flag.description && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2 leading-relaxed">
              {flag.description}
            </p>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  flag.severity === "critical"
                    ? "bg-red-500"
                    : flag.severity === "warning"
                      ? "bg-amber-500"
                      : "bg-slate-500"
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              {confidence}% {ui.aiConfidence}
            </span>
          </div>

          {flag.clause_text && (
            <div>
              <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-blue-500" />{" "}
                {ui.extractedClause}
              </p>
              <div className="border-l-[3px] border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 rounded-r-lg">
                <p className="font-mono text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {flag.clause_text}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />{" "}
              {ui.plainExplanation}
            </p>
            <div className="space-y-2.5">
              {explanationPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {steps.length > 0 && (
            <div>
              <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />{" "}
                {ui.whatYouCanDo}
              </p>
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-emerald-500" />
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
              <p className="text-[11.5px] uppercase tracking-wide font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                <Scale className="w-3.5 h-3.5 text-amber-500" />{" "}
                {ui.legalReferences}
              </p>
              <div className="flex flex-wrap gap-2">
                {refs.map((ref, i) => (
                  <span
                    key={i}
                    className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 py-1 px-3 rounded-lg text-xs font-medium"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// INNER PAGE
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

  const [session, setSession] = useState<any>(undefined);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareRevoked, setShareRevoked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const fetchReport = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/report/${contractId}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Error ${res.status}`);
      }
      const data: ReportData = await res.json();
      setReport(data);
      setExpandedSet(new Set(data.flags.map((f) => f.flag_id)));
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
    if (contractId && session !== undefined) fetchReport();
  }, [contractId, session]);

  const handleDownloadPdf = () => {
    window.open(`/report/${contractId}/print`, "_blank");
  };

  const handleShare = async () => {
    if (!session?.access_token) return;
    setShareLoading(true);
    setShareRevoked(false);
    try {
      const res = await fetch(`${API_BASE}/report/${contractId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShareToken(data.share_token);
      setShareModal(true);
    } catch {
      setPdfToast("Failed to generate share link.");
      setTimeout(() => setPdfToast(null), 3000);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!session?.access_token || !shareToken) return;
    try {
      await fetch(`${API_BASE}/report/${contractId}/share`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setShareToken(null);
      setShareRevoked(true);
    } catch {}
  };

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/report/share/${shareToken}`
    : "";

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
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
    } catch {}
  };

  // =============================================================
  // LOADING
  // =============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-slate-300 dark:border-slate-600 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            Failed to load report
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => fetchReport()}
            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const ui = UI_STRINGS[report.language] ?? UI_STRINGS["en"];

  // =============================================================
  // COMPACT VIEW
  // =============================================================
  if (isCompact) {
    const riskStyle = getRiskCircleStyle(report.risk_score, ui);
    const progressColor = getProgressBarColor(report.risk_score);
    const langLabel =
      {
        en: "English",
        ne: "Nepali",
        hi: "Hindi",
        ar: "Arabic",
        tl: "Filipino",
        bn: "Bengali",
      }[report.language] ?? report.language;

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

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* DISCLAIMER BANNER */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5">
          <div className="max-w-2xl mx-auto px-4 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
              {ui.aiWarning}
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* BACK */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />{" "}
            Back
          </button>

          {/* HERO CARD */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
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
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" /> {ui.completed}
                  </span>
                  {report.language && report.language !== "en" && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                      <Globe className="w-3 h-3" /> {langLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* SCORE CIRCLE */}
              <div
                className={`w-20 h-20 rounded-full border-[3px] ${riskStyle.ring} flex flex-col items-center justify-center shrink-0`}
              >
                <span
                  className={`text-2xl font-black leading-none ${riskStyle.text}`}
                >
                  {report.risk_score}
                </span>
                <span
                  className={`text-[9px] font-bold mt-0.5 ${riskStyle.labelColor}`}
                >
                  {riskStyle.label}
                </span>
              </div>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {[
                {
                  label: ui.critical,
                  count: report.critical_count,
                  color: "text-red-600",
                  bg: "bg-red-50 dark:bg-red-950/30",
                  border: "border-red-100 dark:border-red-900/40",
                },
                {
                  label: ui.warning,
                  count: report.warning_count,
                  color: "text-amber-600",
                  bg: "bg-amber-50 dark:bg-amber-950/30",
                  border: "border-amber-100 dark:border-amber-900/40",
                },
                {
                  label: ui.info,
                  count: report.info_count,
                  color: "text-slate-500",
                  bg: "bg-slate-50 dark:bg-slate-800/60",
                  border: "border-slate-200 dark:border-slate-700",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border ${s.bg} ${s.border} text-center py-3`}
                >
                  <div className={`text-2xl font-black ${s.color}`}>
                    {s.count}
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOAST */}
          {pdfToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
              {pdfToast}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-2.5">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              <Download className="w-4 h-4" /> {ui.downloadReport}
            </button>
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="flex-1 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {shareLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}{" "}
              Share
            </button>
            <button
              onClick={handleViewOriginal}
              title={ui.viewOriginal}
              className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 px-3.5 rounded-xl transition-colors inline-flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* FLAGS */}
          {report.flags.length > 0 ? (
            <div>
              {/* TABS */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-4 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as TabKey);
                      setExpandedSet(new Set());
                    }}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? "border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    {tab.label}
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        activeTab === tab.key
                          ? tab.key === "critical"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                            : tab.key === "warning"
                              ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {(["critical", "warning", "info"] as const).map((sev) => {
                const flagsInSev = visibleFlags.filter(
                  (f) => f.severity === sev,
                );
                if (flagsInSev.length === 0) return null;
                const label =
                  sev === "critical"
                    ? ui.critical
                    : sev === "warning"
                      ? ui.warning
                      : ui.info;

                return (
                  <FlagSeveritySection
                    key={sev}
                    severity={sev}
                    label={label}
                    count={flagsInSev.length}
                    defaultOpen={sev === "critical"}
                  >
                    {flagsInSev.map((flag) => (
                      <FlagBulletItem
                        key={flag.flag_id}
                        flag={flag}
                        ui={ui}
                        isExpanded={expandedSet.has(flag.flag_id)}
                        onToggle={() => toggleExpanded(flag.flag_id)}
                      />
                    ))}
                  </FlagSeveritySection>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0f172a] border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-slate-900 dark:text-slate-100 font-semibold">
                {ui.noFlags}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                {ui.noFlagsDesc}
              </p>
            </div>
          )}

          {/* DISCLAIMER */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-4 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
              <span className="font-semibold">{ui.disclaimerLabel} </span>
              {ui.disclaimer}
            </p>
          </div>

          {/* SIGN UP BANNER */}
          {!session && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Save this report</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a free account to access it anytime.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push("/auth/phone")}
                  className="text-xs font-semibold border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => router.push("/auth/phone")}
                  className="text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Sign up free
                </button>
              </div>
            </div>
          )}

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
        </div>

        {shareModal && (
          <ShareModal
            shareUrl={shareUrl}
            shareCopied={shareCopied}
            shareRevoked={shareRevoked}
            onCopy={handleCopyShareLink}
            onRevoke={handleRevokeShare}
            onClose={() => setShareModal(false)}
          />
        )}
        <div className="h-8" />
      </div>
    );
  }

  // =============================================================
  // FULL VIEW
  // =============================================================
  const verdict = resolveVerdict(report.risk_score);
  const vc = verdictConfig(verdict, ui);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* STICKY DISCLAIMER */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
            {ui.aiWarning}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* BACK */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />{" "}
          Back to Dashboard
        </button>

        {/* PAGE HEADER */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Contract Risk Report
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 break-all">
              ID: {contractId}
            </p>
            {report.analyzed_at && (
              <p className="text-xs text-slate-400 mt-0.5">
                Analysed {new Date(report.analyzed_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* CONTRACT META */}
        {(report.worker_name || report.employer_name || report.country) && (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contract Details
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.worker_name && (
                <div className="flex justify-between items-center gap-3 px-5 py-3">
                  <span className="text-sm text-slate-500 shrink-0">
                    Worker
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate text-right">
                    {report.worker_name}
                  </span>
                </div>
              )}
              {report.employer_name && (
                <div className="flex justify-between items-center gap-3 px-5 py-3">
                  <span className="text-sm text-slate-500 shrink-0">
                    Employer
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate text-right">
                    {report.employer_name}
                  </span>
                </div>
              )}
              {report.country && (
                <div className="flex justify-between items-center gap-3 px-5 py-3">
                  <span className="text-sm text-slate-500 shrink-0">
                    Destination
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate text-right">
                    {report.country}
                  </span>
                </div>
              )}
              {report.original_filename && (
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-slate-500">File</span>
                  <span className="text-xs font-mono text-slate-500 truncate max-w-[60%]">
                    {report.original_filename}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RISK SCORE CARD */}
        <div
          className={`rounded-2xl border ${vc.border} ${vc.bg} overflow-hidden shadow-sm`}
        >
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {vc.icon}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Risk Assessment
                  </p>
                  <p className={`text-base font-bold ${vc.scoreColor}`}>
                    {vc.label}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${vc.badgeBg} ${vc.badgeText}`}
              >
                {verdict}
              </span>
            </div>

            <div className="flex items-end gap-2 mb-3">
              <span
                className={`text-5xl font-black ${vc.scoreColor} leading-none`}
              >
                {report.risk_score}
              </span>
              <span className="text-slate-400 text-sm mb-1 font-medium">
                / 100
              </span>
            </div>

            <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${vc.barColor}`}
                style={{ width: `${report.risk_score}%` }}
              />
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 divide-x divide-slate-200/60 dark:divide-slate-700/40 border-t border-slate-200/60 dark:border-slate-700/40">
            {[
              {
                label: ui.critical,
                count: report.critical_count,
                color: "text-red-600 dark:text-red-400",
              },
              {
                label: ui.warning,
                count: report.warning_count,
                color: "text-amber-600 dark:text-amber-400",
              },
              {
                label: ui.info,
                count: report.info_count,
                color: "text-slate-500 dark:text-slate-400",
              },
            ].map((s) => (
              <div key={s.label} className="text-center py-4">
                <div className={`text-2xl font-black ${s.color}`}>
                  {s.count}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOAST */}
        {pdfToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
            {pdfToast}
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
          >
            <Download className="w-4 h-4" /> Save as PDF
          </button>
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="flex-1 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {shareLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}{" "}
            Share Report
          </button>
        </div>

        {/* FLAGS */}
        {report.flags.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Risk Flags
                <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {report.flags_count}
                </span>
              </h2>
            </div>

            {(["critical", "warning", "info"] as const).map((sev) => {
              const flagsInSev = report.flags.filter((f) => f.severity === sev);
              if (flagsInSev.length === 0) return null;
              const label =
                sev === "critical"
                  ? ui.critical
                  : sev === "warning"
                    ? ui.warning
                    : ui.info;

              return (
                <FlagSeveritySection
                  key={sev}
                  severity={sev}
                  label={label}
                  count={flagsInSev.length}
                  defaultOpen={sev === "critical"}
                >
                  {flagsInSev.map((flag) => (
                    <FlagBulletItem
                      key={flag.flag_id}
                      flag={flag}
                      ui={ui}
                      isExpanded={expandedSet.has(flag.flag_id)}
                      onToggle={() => toggleExpanded(flag.flag_id)}
                    />
                  ))}
                </FlagSeveritySection>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f172a] border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-slate-900 dark:text-slate-100 font-semibold">
              {ui.noFlags}
            </p>
            <p className="text-slate-500 text-sm mt-1">{ui.noFlagsDesc}</p>
          </div>
        )}

        {/* DISCLAIMER */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {ui.disclaimerLabel}{" "}
            </span>
            {ui.disclaimer}
          </p>
        </div>

        {/* AUTH BANNER */}
        {!session && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Save this report</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Create a free account to access it anytime.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push("/auth/phone")}
                className="text-xs font-semibold border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/auth/phone")}
                className="text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign up free
              </button>
            </div>
          </div>
        )}

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
      </div>

      {shareModal && (
        <ShareModal
          shareUrl={shareUrl}
          shareCopied={shareCopied}
          shareRevoked={shareRevoked}
          onCopy={handleCopyShareLink}
          onRevoke={handleRevokeShare}
          onClose={() => setShareModal(false)}
        />
      )}
      <div className="h-8" />
    </div>
  );
}

// =============================================================
// EXPORT
// =============================================================
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
