"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  Phone,
  Globe,
  Shield,
  FileText,
  Briefcase,
  Calendar,
  ChevronRight,
  Loader2,
  Info,
  XCircle,
  Copy,
} from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = "en" | "ne" | "hi" | "ar" | "tl" | "bn";
type Step =
  | "language"
  | "name"
  | "origin"
  | "destination"
  | "job"
  | "departure"
  | "generating"
  | "report";

interface Answers {
  lang: Lang;
  name: string;
  origin: string;
  destination: string;
  job: string;
  departure: string | null;
}
interface ReportData {
  corridor: string;
  illegal: { point: string; source: string }[];
  rights: { point: string; source: string }[];
  checklist: string[];
  emergency: { label: string; number: string }[];
  warnings: string[];
  coverage: "full" | "partial";
  generatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES: {
  code: Lang;
  label: string;
  native: string;
  flag: string;
  countryCode: string;
}[] = [
  {
    code: "en",
    label: "English",
    native: "English",
    flag: "🇬🇧",
    countryCode: "gb",
  },
  {
    code: "ne",
    label: "Nepali",
    native: "नेपाली",
    flag: "🇳🇵",
    countryCode: "np",
  },
  {
    code: "hi",
    label: "Hindi",
    native: "हिन्दी",
    flag: "🇮🇳",
    countryCode: "in",
  },
  {
    code: "ar",
    label: "Arabic",
    native: "العربية",
    flag: "🇸🇦",
    countryCode: "sa",
  },
  {
    code: "tl",
    label: "Filipino",
    native: "Filipino",
    flag: "🇵🇭",
    countryCode: "ph",
  },
  {
    code: "bn",
    label: "Bengali",
    native: "বাংলা",
    flag: "🇧🇩",
    countryCode: "bd",
  },
];

const ORIGIN_COUNTRIES = [
  { code: "NP", name: "Nepal", flag: "🇳🇵", countryCode: "np" },
  { code: "IN", name: "India", flag: "🇮🇳", countryCode: "in" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", countryCode: "ph" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", countryCode: "bd" },
];

const DEST_COUNTRIES = [
  {
    code: "KW",
    name: "Kuwait",
    flag: "🇰🇼",
    countryCode: "kw",
    coverage: "full",
  },
  { code: "OM", name: "Oman", flag: "🇴🇲", countryCode: "om", coverage: "full" },
  {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    countryCode: "my",
    coverage: "full",
  },
  {
    code: "AE",
    name: "UAE",
    flag: "🇦🇪",
    countryCode: "ae",
    coverage: "partial",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    countryCode: "sa",
    coverage: "partial",
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    countryCode: "qa",
    coverage: "partial",
  },
];

const JOB_CATEGORIES = [
  { code: "domestic", label: "Domestic Worker", icon: "🏠" },
  { code: "construction", label: "Construction", icon: "🏗️" },
  { code: "manufacturing", label: "Manufacturing", icon: "🏭" },
  { code: "hospitality", label: "Hospitality", icon: "🍽️" },
  { code: "agriculture", label: "Agriculture", icon: "🌾" },
  { code: "driver", label: "Driver / Transport", icon: "🚗" },
  { code: "cleaning", label: "Cleaning / Sanitation", icon: "🧹" },
  { code: "caregiving", label: "Caregiving", icon: "🏥" },
  { code: "other", label: "Other", icon: "💼" },
];

const EMBASSY_CONTACTS: Record<
  string,
  Record<string, { label: string; number: string }[]>
> = {
  NP: {
    KW: [
      { label: "Nepal Embassy Kuwait", number: "+965-2253-7698" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
    OM: [
      { label: "Nepal Embassy Oman", number: "+968-2469-2777" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
    MY: [
      { label: "Nepal Embassy Malaysia", number: "+60-3-2164-4404" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
    AE: [
      { label: "Nepal Embassy UAE", number: "+971-2-445-1459" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
    SA: [
      { label: "Nepal Embassy Saudi Arabia", number: "+966-11-488-0966" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
    QA: [
      { label: "Nepal Embassy Qatar", number: "+974-4467-3565" },
      { label: "Nepal MoLE", number: "+977-1-4211987" },
    ],
  },
  IN: {
    KW: [{ label: "India Embassy Kuwait", number: "+965-2253-0600" }],
    OM: [{ label: "India Embassy Oman", number: "+968-2468-4451" }],
    MY: [{ label: "India Embassy Malaysia", number: "+60-3-2093-3504" }],
    AE: [{ label: "India Embassy UAE", number: "+971-2-449-2700" }],
    SA: [{ label: "India Embassy Saudi Arabia", number: "+966-11-488-4144" }],
    QA: [{ label: "India Embassy Qatar", number: "+974-4425-5775" }],
  },
  PH: {
    KW: [
      { label: "Philippines Embassy Kuwait", number: "+965-2572-3182" },
      { label: "POEA Hotline", number: "+63-2-8722-1144" },
    ],
    OM: [{ label: "Philippines Embassy Oman", number: "+968-2469-6760" }],
    MY: [{ label: "Philippines Embassy Malaysia", number: "+60-3-2148-4233" }],
    AE: [{ label: "Philippines Embassy UAE", number: "+971-2-635-4212" }],
    SA: [
      { label: "Philippines Embassy Saudi Arabia", number: "+966-11-488-4064" },
    ],
    QA: [{ label: "Philippines Embassy Qatar", number: "+974-4467-5814" }],
  },
  BD: {
    KW: [{ label: "Bangladesh Embassy Kuwait", number: "+965-2572-5872" }],
    OM: [{ label: "Bangladesh Embassy Oman", number: "+968-2469-2828" }],
    MY: [{ label: "Bangladesh Embassy Malaysia", number: "+60-3-4251-1292" }],
    AE: [{ label: "Bangladesh Embassy UAE", number: "+971-2-665-8668" }],
    SA: [
      { label: "Bangladesh Embassy Saudi Arabia", number: "+966-11-488-0786" },
    ],
    QA: [{ label: "Bangladesh Embassy Qatar", number: "+974-4467-3339" }],
  },
};

// ─── UI Labels per language ───────────────────────────────────────────────────
const UI: Record<Lang, Record<string, string>> = {
  en: {
    title: "Pre-Departure Legal Shield",
    subtitle: "Know your rights before you go",
    chooseLang: "Choose your language",
    chooseName: "What is your name?",
    chooseOrigin: "Where are you from?",
    chooseDest: "Where are you going?",
    chooseJob: "What is your job category?",
    chooseDeparture: "When are you departing?",
    skip: "Skip",
    next: "Next",
    back: "Back",
    generating: "Generating your report…",
    illegal: "ILLEGAL — Employer CANNOT do this",
    rights: "YOUR LEGAL RIGHTS",
    checklist: "DEMAND BEFORE SIGNING",
    emergency: "EMERGENCY CONTACTS",
    coverage_full: "Full legal coverage",
    coverage_partial: "Partial coverage — ILO standards applied",
    download: "Download PDF",
    share: "Share via WhatsApp",
    disclaimer:
      "Legal terms in English are authoritative. This is general guidance, not legal advice.",
    urgency: "Departing soon — read ILLEGAL section first",
    generated: "Generated on",
    corridor: "Your corridor",
    departureDate: "Departure date",
    generateReport: "Generate Report",
    generatingHeader: "Generating your legal shield",
    commonRisks: "Common Risks in This Corridor",
    preparedFor: "Prepared for:",
    numberCopied: "Number copied!",
    pdfDownloaded: "PDF downloaded successfully",
    newReport: "New Report",
    otherJob: "Other — describe your job…",
    nextArrow: "Next →",
    noEmergency: "Contact your national embassy for assistance.",
    dashboardBack: "Dashboard",
    pickerFooter:
      "You can ask in any language — the report will be generated in the language you select.",
  },
  ne: {
    title: "प्रस्थान-पूर्व कानुनी सुरक्षा",
    subtitle: "जाने अघि आफ्नो अधिकार जान्नुहोस्",
    chooseLang: "आफ्नो भाषा छान्नुहोस्",
    chooseName: "तपाईंको नाम के हो?",
    chooseOrigin: "तपाईं कहाँबाट हुनुहुन्छ?",
    chooseDest: "तपाईं कहाँ जाँदै हुनुहुन्छ?",
    chooseJob: "तपाईंको काम के हो?",
    chooseDeparture: "तपाईं कहिले जाँदै हुनुहुन्छ?",
    skip: "छोड्नुहोस्",
    next: "अर्को",
    back: "पछाडि",
    generating: "रिपोर्ट बनाउँदैछ…",
    illegal: "अवैध — नियोक्ताले गर्न नपाउने",
    rights: "तपाईंका कानुनी अधिकारहरू",
    checklist: "हस्ताक्षर गर्नु अघि माग गर्नुहोस्",
    emergency: "आपतकालीन सम्पर्क",
    coverage_full: "पूर्ण कानुनी कभरेज",
    coverage_partial: "आंशिक कभरेज — ILO मापदण्ड लागू",
    download: "PDF डाउनलोड गर्नुहोस्",
    share: "WhatsApp मार्फत पठाउनुहोस्",
    disclaimer:
      "अंग्रेजी कानुनी शब्दहरू अधिकारिक छन्। यो सामान्य मार्गदर्शन हो, कानुनी सल्लाह होइन।",
    urgency: "छिट्टै प्रस्थान — पहिले अवैध खण्ड पढ्नुहोस्",
    generated: "बनाइएको मिति",
    corridor: "तपाईंको मार्ग",
    departureDate: "प्रस्थान मिति",
    generateReport: "रिपोर्ट बनाउनुहोस्",
    generatingHeader: "तपाईंको कानुनी सुरक्षा बनाउँदैछ",
    commonRisks: "यस मार्गमा सामान्य जोखिमहरू",
    preparedFor: "तयार गरिएको:",
    numberCopied: "नम्बर कपी भयो!",
    pdfDownloaded: "PDF सफलतापूर्वक डाउनलोड भयो",
    newReport: "नयाँ रिपोर्ट",
    otherJob: "अन्य — आफ्नो काम वर्णन गर्नुहोस्…",
    nextArrow: "अर्को →",
    noEmergency: "सहायताका लागि आफ्नो राष्ट्रिय दूतावाससँग सम्पर्क गर्नुहोस्।",
    dashboardBack: "ड्यासबोर्ड",
    pickerFooter:
      "तपाईं जुनसुकै भाषामा सोध्न सक्नुहुन्छ — रिपोर्ट तपाईंले छानेको भाषामा बनाइनेछ।",
  },
  hi: {
    title: "प्रस्थान-पूर्व कानूनी सुरक्षा",
    subtitle: "जाने से पहले अपने अधिकार जानें",
    chooseLang: "अपनी भाषा चुनें",
    chooseName: "आपका नाम क्या है?",
    chooseOrigin: "आप कहाँ से हैं?",
    chooseDest: "आप कहाँ जा रहे हैं?",
    chooseJob: "आपकी नौकरी की श्रेणी क्या है?",
    chooseDeparture: "आप कब जा रहे हैं?",
    skip: "छोड़ें",
    next: "अगला",
    back: "वापस",
    generating: "रिपोर्ट बना रहे हैं…",
    illegal: "अवैध — नियोक्ता यह नहीं कर सकता",
    rights: "आपके कानूनी अधिकार",
    checklist: "हस्ताक्षर से पहले माँगें",
    emergency: "आपातकालीन संपर्क",
    coverage_full: "पूर्ण कानूनी कवरेज",
    coverage_partial: "आंशिक कवरेज — ILO मानक लागू",
    download: "PDF डाउनलोड करें",
    share: "WhatsApp पर शेयर करें",
    disclaimer:
      "अंग्रेजी कानूनी शब्द प्रामाणिक हैं। यह सामान्य मार्गदर्शन है, कानूनी सलाह नहीं।",
    urgency: "जल्द प्रस्थान — पहले अवैध अनुभाग पढ़ें",
    generated: "बनाने की तिथि",
    corridor: "आपका मार्ग",
    departureDate: "प्रस्थान तिथि",
    generateReport: "रिपोर्ट बनाएं",
    generatingHeader: "आपकी कानूनी सुरक्षा बना रहे हैं",
    commonRisks: "इस मार्ग में सामान्य जोखिम",
    preparedFor: "के लिए तैयार:",
    numberCopied: "नंबर कॉपी हुआ!",
    pdfDownloaded: "PDF सफलतापूर्वक डाउनलोड हुई",
    newReport: "नई रिपोर्ट",
    otherJob: "अन्य — अपना काम बताएं…",
    nextArrow: "अगला →",
    noEmergency: "सहायता के लिए अपने राष्ट्रीय दूतावास से संपर्क करें।",
    dashboardBack: "डैशबोर्ड",
    pickerFooter:
      "आप किसी भी भाषा में पूछ सकते हैं — रिपोर्ट आपकी चुनी भाषा में बनेगी।",
  },
  ar: {
    title: "الدرع القانوني قبل المغادرة",
    subtitle: "اعرف حقوقك قبل السفر",
    chooseLang: "اختر لغتك",
    chooseName: "ما اسمك؟",
    chooseOrigin: "من أين أنت؟",
    chooseDest: "إلى أين أنت ذاهب؟",
    chooseJob: "ما هي فئة عملك؟",
    chooseDeparture: "متى موعد مغادرتك؟",
    skip: "تخطي",
    next: "التالي",
    back: "رجوع",
    generating: "جاري إنشاء التقرير…",
    illegal: "غير قانوني — لا يحق لصاحب العمل فعل ذلك",
    rights: "حقوقك القانونية",
    checklist: "اطلب قبل التوقيع",
    emergency: "جهات الاتصال في حالات الطوارئ",
    coverage_full: "تغطية قانونية كاملة",
    coverage_partial: "تغطية جزئية — معايير منظمة العمل الدولية مطبقة",
    download: "تحميل PDF",
    share: "مشاركة عبر واتساب",
    disclaimer:
      "المصطلحات القانونية باللغة الإنجليزية هي المرجع. هذا توجيه عام وليس استشارة قانونية.",
    urgency: "المغادرة قريبًا — اقرأ قسم الغير قانوني أولاً",
    generated: "تاريخ الإنشاء",
    corridor: "مسارك",
    departureDate: "تاريخ المغادرة",
    generateReport: "إنشاء التقرير",
    generatingHeader: "جاري إنشاء درعك القانوني",
    commonRisks: "المخاطر الشائعة في هذا المسار",
    preparedFor: "معد لـ:",
    numberCopied: "تم نسخ الرقم!",
    pdfDownloaded: "تم تحميل PDF بنجاح",
    newReport: "تقرير جديد",
    otherJob: "أخرى — صف وظيفتك…",
    nextArrow: "التالي →",
    noEmergency: "تواصل مع سفارتك الوطنية للحصول على المساعدة.",
    dashboardBack: "لوحة التحكم",
    pickerFooter:
      "يمكنك السؤال بأي لغة — سيتم إنشاء التقرير باللغة التي تختارها.",
  },
  tl: {
    title: "Legal na Kalasag Bago Umalis",
    subtitle: "Alamin ang iyong mga karapatan bago umalis",
    chooseLang: "Piliin ang iyong wika",
    chooseName: "Ano ang iyong pangalan?",
    chooseOrigin: "Saan ka galing?",
    chooseDest: "Saan ka pupunta?",
    chooseJob: "Ano ang iyong kategorya ng trabaho?",
    chooseDeparture: "Kailan ka aalis?",
    skip: "Laktawan",
    next: "Susunod",
    back: "Bumalik",
    generating: "Ginagawa ang iyong ulat…",
    illegal: "ILEGAL — Hindi Maaaring Gawin ng Employer",
    rights: "MGA LEGAL NA KARAPATAN MO",
    checklist: "HINGIN BAGO PUMIRMA",
    emergency: "MGA EMERGENCY NA CONTACT",
    coverage_full: "Buong legal na saklaw",
    coverage_partial: "Bahagyang saklaw — ILO pamantayan ang inilapat",
    download: "I-download ang PDF",
    share: "Ibahagi sa WhatsApp",
    disclaimer:
      "Ang mga legal na termino sa Ingles ang awtoridad. Ito ay pangkalahatang gabay, hindi legal na payo.",
    urgency: "Malapit na umalis — basahin muna ang ILEGAL na seksyon",
    generated: "Nabuo noong",
    corridor: "Ang iyong ruta",
    departureDate: "Petsa ng pag-alis",
    generateReport: "Gumawa ng Ulat",
    generatingHeader: "Ginagawa ang iyong legal na kalasag",
    commonRisks: "Mga Karaniwang Panganib sa Rutang Ito",
    preparedFor: "Inihanda para kay:",
    numberCopied: "Nakopya ang numero!",
    pdfDownloaded: "Matagumpay na na-download ang PDF",
    newReport: "Bagong Ulat",
    otherJob: "Iba pa — ilarawan ang iyong trabaho…",
    nextArrow: "Susunod →",
    noEmergency: "Makipag-ugnayan sa iyong pambansang embahada para sa tulong.",
    dashboardBack: "Dashboard",
    pickerFooter:
      "Maaari kang magtanong sa anumang wika — ang ulat ay gagawin sa wikang iyong pinili.",
  },
  bn: {
    title: "যাত্রার আগে আইনি সুরক্ষা",
    subtitle: "যাওয়ার আগে আপনার অধিকার জানুন",
    chooseLang: "আপনার ভাষা বেছে নিন",
    chooseName: "আপনার নাম কী?",
    chooseOrigin: "আপনি কোথা থেকে?",
    chooseDest: "আপনি কোথায় যাচ্ছেন?",
    chooseJob: "আপনার কাজের ধরন কী?",
    chooseDeparture: "আপনি কবে যাচ্ছেন?",
    skip: "এড়িয়ে যান",
    next: "পরবর্তী",
    back: "পিছনে",
    generating: "রিপোর্ট তৈরি হচ্ছে…",
    illegal: "অবৈধ — নিয়োগকর্তা এটি করতে পারবেন না",
    rights: "আপনার আইনি অধিকার",
    checklist: "স্বাক্ষর করার আগে দাবি করুন",
    emergency: "জরুরি যোগাযোগ",
    coverage_full: "সম্পূর্ণ আইনি কভারেজ",
    coverage_partial: "আংশিক কভারেজ — ILO মান প্রযোজ্য",
    download: "PDF ডাউনলোড করুন",
    share: "WhatsApp-এ শেয়ার করুন",
    disclaimer:
      "ইংরেজিতে আইনি শর্তাবলী কর্তৃত্বপূর্ণ। এটি সাধারণ নির্দেশিকা, আইনি পরামর্শ নয়।",
    urgency: "শীঘ্রই যাত্রা — প্রথমে অবৈধ অংশ পড়ুন",
    generated: "তৈরির তারিখ",
    corridor: "আপনার করিডোর",
    departureDate: "যাত্রার তারিখ",
    generateReport: "রিপোর্ট তৈরি করুন",
    generatingHeader: "আপনার আইনি সুরক্ষা তৈরি হচ্ছে",
    commonRisks: "এই করিডোরে সাধারণ ঝুঁকি",
    preparedFor: "যার জন্য তৈরি:",
    numberCopied: "নম্বর কপি হয়েছে!",
    pdfDownloaded: "PDF সফলভাবে ডাউনলোড হয়েছে",
    newReport: "নতুন রিপোর্ট",
    otherJob: "অন্যান্য — আপনার কাজ বর্ণনা করুন…",
    nextArrow: "পরবর্তী →",
    noEmergency: "সহায়তার জন্য আপনার জাতীয় দূতাবাসে যোগাযোগ করুন।",
    dashboardBack: "ড্যাশবোর্ড",
    pickerFooter:
      "আপনি যেকোনো ভাষায় জিজ্ঞাসা করতে পারেন — রিপোর্ট আপনার বেছে নেওয়া ভাষায় তৈরি হবে।",
  },
};

// ─── API Call ─────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function generateReport(answers: Answers): Promise<ReportData> {
  const destInfo = DEST_COUNTRIES.find((d) => d.code === answers.destination);
  const originInfo = ORIGIN_COUNTRIES.find((o) => o.code === answers.origin);

  const response = await fetch(
    `${BACKEND_URL}/api/compliance-report/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: answers.origin,
        destination: answers.destination,
        job: answers.job,
        lang: answers.lang,
        departure: answers.departure,
      }),
    },
  );

  if (!response.ok) throw new Error("Backend error");

  const { data: parsed, coverage } = await response.json();
  const emergency =
    EMBASSY_CONTACTS[answers.origin]?.[answers.destination] ?? [];

  return {
    corridor: `${originInfo?.name ?? ""} → ${destInfo?.name ?? ""}`,
    illegal: parsed.illegal ?? [],
    rights: parsed.rights ?? [],
    checklist: parsed.checklist ?? [],
    emergency,
    warnings: parsed.warnings ?? [],
    coverage: coverage as "full" | "partial",
    generatedAt: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ComplianceReportPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("language");
  const [answers, setAnswers] = useState<Answers>({
    lang: "en",
    name: "",
    origin: "",
    destination: "",
    job: "",
    departure: null,
  });

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    const validLangs: Lang[] = ["en", "ne", "hi", "ar", "tl", "bn"];
    if (stored && validLangs.includes(stored)) {
      setAnswers((a) => ({ ...a, lang: stored }));
    }
    setMounted(true);
  }, []);

  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  useEffect(() => {
    const bc = new BroadcastChannel("ms-pdf");
    bc.onmessage = () => {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    };
    return () => bc.close();
  }, []);

  const t = UI[answers.lang];
  const isRTL = answers.lang === "ar";

  // Check departure urgency
  const isUrgent = answers.departure
    ? new Date(answers.departure + "T00:00:00").getTime() - Date.now() <=
      7 * 24 * 60 * 60 * 1000
    : false;

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/");
    });
  }, [router]);

  // Wake Render on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "generating") return;
    setActiveStage(0);
    const interval = setInterval(() => {
      setActiveStage((s) => (s < 4 ? s + 1 : s));
    }, 600);
    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    try {
      const data = await generateReport(answers);
      setReport(data);
      setStep("report");
    } catch (e) {
      setError("Failed to generate report. Please try again.");
      setStep("departure");
    }
  };

  const handleShare = () => {
    const destInfo = DEST_COUNTRIES.find((d) => d.code === answers.destination);
    const originInfo = ORIGIN_COUNTRIES.find((o) => o.code === answers.origin);
    const text = `MigrantShield Pre-Departure Report: ${originInfo?.name} → ${destInfo?.name}\nGenerated: ${report?.generatedAt}\nKnow your rights before you go: ${window.location.origin}/compliance-report`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleDownload = () => {
    if (!report) return;
    sessionStorage.setItem("compliance-answers", JSON.stringify(answers));
    sessionStorage.setItem("compliance-report", JSON.stringify(report));
    window.open("/compliance-report/print", "_blank");
  };

  const handleCopyContact = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Step: Language ──────────────────────────────────────────────────────────
  if (step === "language") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-4 flex flex-col">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm mb-5 transition-colors w-fit"
          >
            <ArrowLeft size={16} /> {t.dashboardBack}
          </button>

          <div className="mb-5 mt-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-lg mb-4 mx-auto">
              <Shield size={24} className="text-white dark:text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t.subtitle}
            </p>
          </div>

          <p className="text-center text-slate-700 dark:text-slate-300 font-medium mb-6">
            {t.chooseLang}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setAnswers((a) => ({ ...a, lang: lang.code }));
                  setStep("name");
                }}
                className="group flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-900 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150 active:scale-95"
              >
                <img
                  src={`https://flagcdn.com/32x24/${lang.countryCode}.png`}
                  width={32}
                  height={24}
                  alt={lang.label}
                  className="rounded-sm"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  {lang.native}
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">
            {t.pickerFooter}
          </p>
        </div>
      </div>
    );
  }

  // ── Step: Name ──────────────────────────────────────────────────────────────
  if (step === "name") {
    return (
      <QuestionStep
        t={t}
        step={2}
        totalSteps={6}
        title={t.chooseName}
        onBack={() => setStep("language")}
        isRTL={isRTL}
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={
              answers.lang === "ar" ? "اكتب اسمك هنا…" : "Type your name here…"
            }
            value={answers.name}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, name: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && answers.name.trim()) setStep("origin");
            }}
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-4 text-slate-800 dark:text-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <button
            onClick={() => {
              if (answers.name.trim()) setStep("origin");
            }}
            disabled={!answers.name.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {t.next} <ArrowRight size={16} />
          </button>
        </div>
      </QuestionStep>
    );
  }

  // ── Step: Origin ────────────────────────────────────────────────────────────
  if (step === "origin") {
    return (
      <QuestionStep
        t={t}
        step={2}
        totalSteps={6}
        title={t.chooseOrigin}
        onBack={() => setStep("language")}
        isRTL={isRTL}
      >
        <div className="grid grid-cols-2 gap-3">
          {ORIGIN_COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setAnswers((a) => ({ ...a, origin: c.code }));
                setStep("destination");
              }}
              className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-5 hover:border-slate-900 hover:shadow-sm transition-all text-left active:scale-95"
            >
              <img
                src={`https://flagcdn.com/32x24/${c.countryCode}.png`}
                width={32}
                height={24}
                alt={c.name}
                className="rounded-sm shrink-0"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </QuestionStep>
    );
  }

  // ── Step: Destination ───────────────────────────────────────────────────────
  if (step === "destination") {
    return (
      <QuestionStep
        t={t}
        step={3}
        totalSteps={6}
        title={t.chooseDest}
        onBack={() => setStep("origin")}
        isRTL={isRTL}
      >
        <div className="grid grid-cols-2 gap-3">
          {DEST_COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setAnswers((a) => ({ ...a, destination: c.code }));
                setStep("job");
              }}
              className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-5 hover:border-slate-900 hover:shadow-sm transition-all text-left gap-2 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/32x24/${c.countryCode}.png`}
                  width={32}
                  height={24}
                  alt={c.name}
                  className="rounded-sm shrink-0"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {c.name}
                </span>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${
                  c.coverage === "full"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {c.coverage === "full"
                  ? "✓ " + t.coverage_full
                  : "⚠ " + t.coverage_partial}
              </span>
            </button>
          ))}
        </div>
      </QuestionStep>
    );
  }

  // ── Step: Job ───────────────────────────────────────────────────────────────
  if (step === "job") {
    return (
      <QuestionStep
        t={t}
        step={4}
        totalSteps={6}
        title={t.chooseJob}
        onBack={() => setStep("destination")}
        isRTL={isRTL}
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            {JOB_CATEGORIES.filter((j) => j.code !== "other").map((j) => (
              <button
                key={j.code}
                onClick={() => {
                  setAnswers((a) => ({ ...a, job: j.code }));
                  setStep("departure");
                }}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 hover:border-slate-900 hover:shadow-sm transition-all text-left active:scale-95"
              >
                <span className="text-xl">{j.icon}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                  {j.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4">
            <span className="text-2xl">💼</span>
            <input
              type="text"
              placeholder={t.otherJob}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              onChange={(e) =>
                setAnswers((a) => ({ ...a, job: e.target.value || "other" }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && answers.job && answers.job !== "other")
                  setStep("departure");
              }}
            />
            <button
              onClick={() => {
                if (answers.job && answers.job !== "other")
                  setStep("departure");
              }}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
              {t.nextArrow}
            </button>
          </div>
        </div>
      </QuestionStep>
    );
  }

  // ── Step: Departure ─────────────────────────────────────────────────────────
  if (step === "departure") {
    return (
      <QuestionStep
        t={t}
        step={5}
        totalSteps={6}
        title={t.chooseDeparture}
        onBack={() => setStep("job")}
        isRTL={isRTL}
      >
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <XCircle size={15} /> {error}
          </div>
        )}

        {/* Live corridor preview */}
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl px-5 py-4 mb-5">
          <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
            {t.corridor}
          </p>
          <div className="flex items-center gap-3">
            <img
              src={`https://flagcdn.com/24x18/${ORIGIN_COUNTRIES.find((o) => o.code === answers.origin)?.countryCode}.png`}
              width={24}
              height={18}
              className="rounded-sm"
              alt=""
            />
            <span className="text-teal-700 dark:text-teal-300 font-semibold text-sm">
              {ORIGIN_COUNTRIES.find((o) => o.code === answers.origin)?.name}
            </span>
            <ArrowRight size={16} className="text-teal-500" />
            <img
              src={`https://flagcdn.com/24x18/${DEST_COUNTRIES.find((d) => d.code === answers.destination)?.countryCode}.png`}
              width={24}
              height={18}
              className="rounded-sm"
              alt=""
            />
            <span className="text-teal-700 dark:text-teal-300 font-semibold text-sm">
              {DEST_COUNTRIES.find((d) => d.code === answers.destination)?.name}
            </span>
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1.5">
            {JOB_CATEGORIES.find((j) => j.code === answers.job)?.icon}{" "}
            {JOB_CATEGORIES.find((j) => j.code === answers.job)?.label}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Calendar size={14} className="inline mr-1" />
            {t.departureDate}
          </label>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, departure: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setAnswers((a) => ({ ...a, departure: null }));
              handleGenerate();
            }}
            className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t.skip}
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Shield size={16} /> {t.generateReport}
          </button>
        </div>
      </QuestionStep>
    );
  }

  // ── Step: Generating ────────────────────────────────────────────────────────
  if (step === "generating") {
    const stages = [
      {
        id: "pdf",
        label: "Extracting contract text",
        sub: "PyMuPDF parsing raw PDF — stripping headers, footers",
      },
      {
        id: "rag",
        label: "Matching relevant labour law",
        sub: `Finding laws for ${DEST_COUNTRIES.find((d) => d.code === answers.destination)?.name ?? "your destination"}`,
      },
      {
        id: "llm",
        label: "AI analysis — Groq LLaMA 3.3 70B",
        sub: "Clause-by-clause risk detection + legal grounding",
      },
      {
        id: "translate",
        label: "Multilingual translation",
        sub:
          answers.lang !== "en"
            ? "Translating to " +
              (LANGUAGES.find((l) => l.code === answers.lang)?.label ??
                answers.lang)
            : "English output",
      },
      {
        id: "render",
        label: "Report assembly",
        sub: "Sections, checklist, emergency contacts, PDF layout",
      },
    ];

    const originInfo = ORIGIN_COUNTRIES.find((o) => o.code === answers.origin);
    const destInfo = DEST_COUNTRIES.find((d) => d.code === answers.destination);

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shrink-0 animate-pulse">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t.generatingHeader}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <img
                  src={`https://flagcdn.com/24x18/${originInfo?.countryCode}.png`}
                  width={20}
                  height={15}
                  className="rounded-sm"
                  alt=""
                />
                {originInfo?.name}
                <span>→</span>
                <img
                  src={`https://flagcdn.com/24x18/${destInfo?.countryCode}.png`}
                  width={20}
                  height={15}
                  className="rounded-sm"
                  alt=""
                />
                {destInfo?.name}
                <span>·</span>
                {JOB_CATEGORIES.find((j) => j.code === answers.job)?.label}
              </p>
            </div>
          </div>

          {/* Pipeline */}
          <div className="flex flex-col">
            {stages.map((stage, i) => {
              const isDone = i < activeStage;
              const isActive = i === activeStage;
              const isLast = i === stages.length - 1;

              return (
                <div key={stage.id} className="flex gap-0">
                  {/* Left rail */}
                  <div className="flex flex-col items-center w-9 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                        isDone
                          ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                          : isActive
                            ? "bg-teal-600 border-teal-600 text-white animate-pulse"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                      }`}
                    >
                      {isDone ? <CheckCircle size={13} /> : i + 1}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-px flex-1 min-h-[24px] my-1 transition-colors duration-500 ${
                          isDone
                            ? "bg-teal-400"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    )}
                  </div>

                  {/* Right content */}
                  <div className="pb-6 pl-3 flex-1 pt-0.5">
                    <p
                      className={`text-sm font-medium leading-tight transition-colors ${
                        isDone || isActive
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {stage.label}
                    </p>
                    {(isDone || isActive) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {stage.sub}
                      </p>
                    )}

                    {isActive && stage.id === "llm" && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400">
                        <Loader2 size={12} className="animate-spin shrink-0" />
                        Scanning clause by clause…
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer progress */}
          <div className="mt-2 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <span className="text-xs text-slate-400 tabular-nums">
              {Math.round((activeStage / stages.length) * 100)}%
            </span>
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${(activeStage / stages.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              Step {activeStage + 1}/{stages.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Report ────────────────────────────────────────────────────────────
  if (step === "report" && report) {
    return (
      <div
        className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${isRTL ? "rtl" : "ltr"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="max-w-2xl mx-auto w-full px-4 py-8 pb-28 print:pb-8">
          {/* ── Actions bar ── */}
          <div className="flex items-center justify-between mb-6 print:hidden">
            <button
              onClick={() => setStep("language")}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm transition-colors"
            >
              <ArrowLeft size={16} /> {t.newReport}
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Share2 size={14} /> {t.share}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} /> {t.download}
              </button>
            </div>
          </div>

          {/* ── Report header ── */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl px-6 py-6 mb-4 print:rounded-none print:border print:border-slate-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-teal-500 p-2 rounded-lg">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <p className="text-teal-400 text-xs font-semibold uppercase tracking-widest">
                  MigrantShield
                </p>
                <h1 className="text-white text-lg font-bold leading-tight">
                  {t.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <img
                src={`https://flagcdn.com/24x18/${ORIGIN_COUNTRIES.find((o) => o.code === answers.origin)?.countryCode}.png`}
                width={24}
                height={18}
                className="rounded-sm"
                alt=""
              />
              <span className="text-base font-semibold text-white">
                {ORIGIN_COUNTRIES.find((o) => o.code === answers.origin)?.name}
              </span>
              <ArrowRight size={14} className="text-teal-400" />
              <img
                src={`https://flagcdn.com/24x18/${DEST_COUNTRIES.find((d) => d.code === answers.destination)?.countryCode}.png`}
                width={24}
                height={18}
                className="rounded-sm"
                alt=""
              />
              <span className="text-base font-semibold text-white">
                {
                  DEST_COUNTRIES.find((d) => d.code === answers.destination)
                    ?.name
                }
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                {JOB_CATEGORIES.find((j) => j.code === answers.job)?.icon}{" "}
                {JOB_CATEGORIES.find((j) => j.code === answers.job)?.label}
              </span>
              {answers.departure && (
                <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                  📅{" "}
                  {new Date(answers.departure).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  report.coverage === "full"
                    ? "bg-emerald-900/60 text-emerald-300"
                    : "bg-amber-900/60 text-amber-300"
                }`}
              >
                {report.coverage === "full"
                  ? "✓ " + t.coverage_full
                  : "⚠ " + t.coverage_partial}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              {t.generated}: {report.generatedAt}
            </p>
            {answers.name && (
              <p className="text-slate-400 text-xs mt-1">
                {t.preparedFor}{" "}
                <span className="text-white font-medium">{answers.name}</span>
              </p>
            )}
          </div>

          {/* ── Urgency banner ── */}
          {isUrgent && (
            <div className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-5 py-3.5 mb-4">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="text-sm font-semibold">⚡ {t.urgency}</p>
            </div>
          )}

          {/* ── Partial coverage warning ── */}
          {report.coverage === "partial" && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3.5 mb-4">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                {t.coverage_partial}. ILO international standards applied where
                local law data is limited.
              </p>
            </div>
          )}

          {/* ── ILLEGAL section ── */}
          <ReportSection
            color="red"
            icon={<XCircle size={18} className="text-red-600" />}
            title={t.illegal}
            defaultOpen
          >
            <div className="space-y-3">
              {report.illegal.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-700 text-[10px] font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-snug">
                      {item.point}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5 italic">
                      {item.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* ── RIGHTS section ── */}
          <ReportSection
            color="emerald"
            icon={<CheckCircle size={18} className="text-emerald-600" />}
            title={t.rights}
          >
            <div className="space-y-3">
              {report.rights.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle size={10} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-snug">
                      {item.point}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5 italic">
                      {item.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* ── CHECKLIST section ── */}
          <ReportSection
            color="blue"
            icon={<FileText size={18} className="text-blue-600" />}
            title={t.checklist}
          >
            <div className="space-y-2.5">
              {report.checklist.map((item, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </ReportSection>

          {/* ── WARNINGS section ── */}
          {report.warnings.length > 0 && (
            <ReportSection
              color="amber"
              icon={<AlertTriangle size={18} className="text-amber-600" />}
              title={t.commonRisks}
            >
              <div className="space-y-2.5">
                {report.warnings.map((w, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      {w}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* ── EMERGENCY section ── */}
          <ReportSection
            color="slate"
            icon={<Phone size={18} className="text-slate-600" />}
            title={t.emergency}
          >
            <div className="space-y-3">
              {report.emergency.length === 0 ? (
                <p className="text-sm text-slate-500">{t.noEmergency}</p>
              ) : (
                report.emergency.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        {e.label}
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-wide">
                        {e.number}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyContact(e.number)}
                      className="text-slate-400 hover:text-teal-600 transition-colors"
                      title="Copy number"
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ReportSection>

          {/* ── Disclaimer ── */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 mt-4">
            <div className="flex gap-2">
              <Globe size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.disclaimer}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              MigrantShield · migrantshield.app · This report was generated by
              AI. Verify critical information with your embassy.
            </p>
          </div>

          {copied && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg print:hidden">
              {t.numberCopied}
            </div>
          )}
          {downloadSuccess && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-500 text-white text-sm font-bold px-6 py-3.5 rounded-full shadow-xl print:hidden">
              <CheckCircle size={18} className="text-white shrink-0" />
              {t.pdfDownloaded}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Shared: Question Step Wrapper ────────────────────────────────────────────
function QuestionStep({
  t,
  step,
  totalSteps,
  title,
  onBack,
  children,
  isRTL,
}: {
  t: Record<string, string>;
  step: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  isRTL?: boolean;
}) {
  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">
            {step}/{totalSteps}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// ─── Shared: Report Section ───────────────────────────────────────────────────
function ReportSection({
  color,
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  color: "red" | "emerald" | "blue" | "amber" | "slate";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const borderMap = {
    red: "border-l-red-500",
    emerald: "border-l-emerald-500",
    blue: "border-l-blue-500",
    amber: "border-l-amber-500",
    slate: "border-l-slate-400",
  };
  const bgMap = {
    red: "bg-red-50 dark:bg-red-950/20",
    emerald: "bg-emerald-50 dark:bg-emerald-950/20",
    blue: "bg-blue-50 dark:bg-blue-950/20",
    amber: "bg-amber-50 dark:bg-amber-950/20",
    slate: "bg-slate-50 dark:bg-slate-900",
  };

  return (
    <div
      className={`border border-slate-200 dark:border-slate-800 border-l-4 ${borderMap[color]} rounded-xl overflow-hidden mb-4`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full ${bgMap[color]} px-5 py-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-left`}
      >
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex-1">
          {title}
        </h3>
        <ChevronRight
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="bg-white dark:bg-slate-900 px-5 py-4">{children}</div>
      )}
    </div>
  );
}
