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

// =============================================================
// HELPERS
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

function severityStyles(severity: string) {
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// =============================================================
// COMPONENT
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
      if (navigator.share) {
        await navigator.share({ title: "MigrantShield Report", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (_) {}
  };

  // =============================================================
  // RENDER STATES
  // =============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Failed to Load Report
          </h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => fetchReport()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const verdict = resolveVerdict(report.risk_score);
  const vs = verdictStyles(verdict);
  const ui = UI_STRINGS[report.language] ?? UI_STRINGS["en"];

  // =============================================================
  // MAIN RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50">
      {/* DISCLAIMER BANNER */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 mt-1.5" style={{ fontSize: "11px" }}>
            {ui.aiWarning}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* BACK */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* HEADER */}
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

        {/* CONTRACT METADATA */}
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

        {/* VERDICT + SCORE */}
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

        {/* ACTION BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={() => window.open(`/report/${contractId}/print`, "_blank")}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share Report
          </button>
        </div>

        {/* FLAG CARDS */}
        {report.flags.length > 0 ? (
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Risk Flags ({report.flags_count})
            </h2>
            <div className="space-y-3">
              {report.flags.map((flag) => {
                const ss = severityStyles(flag.severity);
                const isExpanded = expanded === flag.flag_id;

                // Normalize mitigation_steps — handle missing/null from old records
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
                    {/* COLLAPSED HEADER — always visible */}
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
                                  {
                                    console.log(
                                      "flag_type raw:",
                                      flag.flag_type,
                                    ) as any
                                  }
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

                    {/* EXPANDED DETAIL */}
                    {isExpanded && (
                      <div className="px-4 pb-5 space-y-5 border-t border-slate-100 dark:border-slate-800">
                        {/* SECTION A — Extracted Clause */}
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

                        {/* SECTION B — Plain Language */}
                        <div>
                          <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            📖 {ui.plainExplanation}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3.5 border-l border-slate-200 dark:border-slate-800">
                            {flag.description}
                          </p>
                        </div>

                        {/* SECTION C — What You Can Do */}
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

                        {/* SECTION D — Legal References */}
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

        {/* BOTTOM DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600">
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
