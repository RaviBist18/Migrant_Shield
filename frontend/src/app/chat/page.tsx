"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Send,
  Shield,
  Globe,
} from "lucide-react";
import { translations, type Lang } from "@/lib/i18n/landing";

// ─── Types ────────────────────────────────────────────────────────────────────
type LangCode = "en" | "ne" | "hi" | "ar" | "fil" | "bn";

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  feedback?: "up" | "down" | null;
}

// ─── Language Config ──────────────────────────────────────────────────────────
const LANGUAGES: {
  code: LangCode;
  name: string;
  native: string;
  flag: string;
  countryCode: string;
  welcome: string;
  placeholder: string;
  disclaimer: string;
}[] = [
  {
    code: "en",
    name: "English",
    native: "English",
    flag: "🇬🇧",
    countryCode: "gb",
    welcome:
      "Hello! I'm your MigrantShield Legal Assistant. Ask me anything about your rights as a migrant worker — contracts, wages, passport confiscation, recruitment fees, job changes, and more.\n\nYou can write in any language and I'll respond in the same language.",
    placeholder: "Ask anything about your rights…",
    disclaimer:
      "⚖️ AI-generated legal information, not legal advice. Consult a qualified lawyer or your country's embassy for your specific situation.",
  },
  {
    code: "ne",
    name: "Nepali",
    native: "नेपाली",
    flag: "🇳🇵",
    countryCode: "np",
    welcome:
      "नमस्ते! म तपाईंको MigrantShield कानूनी सहायक हुँ।\n\nम यी विषयमा सहयोग गर्न सक्छु:\n• राहदानी जफत\n• तलब नपाएको वा ढिलो भएको\n• भर्ना शुल्क\n• सम्झौता उल्लंघन\n• काम परिवर्तन र स्थानान्तरण\n\nजे पनि सोध्नुहोस् — तपाईं जुन भाषामा लेख्नुहुन्छ, म उही भाषामा जवाफ दिनेछु।",
    placeholder: "आफ्नो अधिकारबारे केही पनि सोध्नुहोस्…",
    disclaimer:
      "⚖️ AI-उत्पन्न कानूनी जानकारी, कानूनी सल्लाह होइन। आफ्नो परिस्थितिका लागि योग्य वकिल वा दूतावाससँग परामर्श गर्नुहोस्।",
  },
  {
    code: "hi",
    name: "Hindi",
    native: "हिंदी",
    flag: "🇮🇳",
    countryCode: "in",
    welcome:
      "नमस्ते! मैं आपका MigrantShield कानूनी सहायक हूँ।\n\nमैं इन विषयों में मदद कर सकता हूँ:\n• पासपोर्ट जब्ती\n• अवैतनिक या विलंबित वेतन\n• भर्ती शुल्क\n• अनुबंध उल्लंघन\n• नौकरी परिवर्तन और स्थानांतरण\n\nकुछ भी पूछें — आप जिस भाषा में लिखेंगे, मैं उसी में जवाब दूंगा।",
    placeholder: "अपने अधिकारों के बारे में कुछ भी पूछें…",
    disclaimer:
      "⚖️ AI-जनित कानूनी जानकारी, कानूनी सलाह नहीं। अपनी स्थिति के लिए योग्य वकील या दूतावास से परामर्श करें।",
  },
  {
    code: "ar",
    name: "Arabic",
    native: "العربية",
    flag: "🇸🇦",
    countryCode: "sa",
    welcome:
      "مرحباً! أنا مساعدك القانوني في MigrantShield.\n\nيمكنني مساعدتك في:\n• مصادرة جواز السفر\n• الأجور غير المدفوعة أو المتأخرة\n• رسوم التوظيف\n• انتهاكات العقد\n• تغيير الوظيفة والنقل\n\nاسألني أي شيء — سأرد بنفس اللغة التي تكتب بها.",
    placeholder: "اسأل عن أي شيء يتعلق بحقوقك…",
    disclaimer:
      "⚖️ معلومات قانونية من الذكاء الاصطناعي، وليست استشارة قانونية. استشر محامياً مؤهلاً أو سفارة بلدك لوضعك الخاص.",
  },
  {
    code: "fil",
    name: "Filipino",
    native: "Filipino",
    flag: "🇵🇭",
    countryCode: "ph",
    welcome:
      "Kamusta! Ako ang iyong MigrantShield Legal Assistant.\n\nMaaari kitang tulungan sa:\n• Pagkumpiska ng pasaporte\n• Hindi nabayarang o nahuling sahod\n• Recruitment fees\n• Paglabag sa kontrata\n• Pagpapalit ng trabaho at paglipat\n\nMagtanong ng kahit ano — sasagutin kita sa wikang sinusulat mo.",
    placeholder: "Magtanong ng anumang bagay tungkol sa iyong mga karapatan…",
    disclaimer:
      "⚖️ Impormasyon sa batas mula sa AI, hindi legal na payo. Kumonsulta sa kwalipikadong abogado o embahada ng iyong bansa.",
  },
  {
    code: "bn",
    name: "Bangla",
    native: "বাংলা",
    flag: "🇧🇩",
    countryCode: "bd",
    welcome:
      "হ্যালো! আমি আপনার MigrantShield আইনি সহায়ক।\n\nআমি এই বিষয়গুলোতে সাহায্য করতে পারি:\n• পাসপোর্ট জব্দ\n• অপ্রদত্ত বা বিলম্বিত বেতন\n• নিয়োগ ফি\n• চুক্তি লঙ্ঘন\n• চাকরি পরিবর্তন ও বদলি\n\nযেকোনো কিছু জিজ্ঞেস করুন — আপনি যে ভাষায় লিখবেন, আমি সেই ভাষায় উত্তর দেব।",
    placeholder: "আপনার অধিকার সম্পর্কে যেকোনো কিছু জিজ্ঞেস করুন…",
    disclaimer:
      "⚖️ AI-উৎপন্ন আইনি তথ্য, আইনি পরামর্শ নয়। আপনার পরিস্থিতির জন্য যোগ্য আইনজীবী বা দূতাবাসের সাথে পরামর্শ করুন।",
  },
];

// ─── Suggested Questions per language ────────────────────────────────────────
const SUGGESTED: Record<LangCode, string[]> = {
  en: [
    "Can my employer confiscate my passport?",
    "What are my rights if wages are delayed?",
    "Are recruitment fees legal?",
    "Can I change jobs in this country?",
    "What if my employer breaks the contract?",
    "How do I file a complaint against my employer?",
  ],
  ne: [
    "के मेरो नियोक्ताले मेरो राहदानी जफत गर्न सक्छ?",
    "ज्याला ढिलो भयो भने मेरा अधिकारहरू के हुन्?",
    "के भर्ना शुल्क कानूनी छ?",
    "के म यस देशमा काम परिवर्तन गर्न सक्छु?",
    "नियोक्ताले सम्झौता तोडे के गर्ने?",
    "नियोक्ता विरुद्ध उजुरी कसरी गर्ने?",
  ],
  hi: [
    "क्या मेरा नियोक्ता मेरा पासपोर्ट जब्त कर सकता है?",
    "अगर वेतन देरी हो तो मेरे क्या अधिकार हैं?",
    "क्या भर्ती शुल्क कानूनी है?",
    "क्या मैं इस देश में नौकरी बदल सकता हूँ?",
    "अगर नियोक्ता अनुबंध तोड़े तो क्या करें?",
    "नियोक्ता के खिलाफ शिकायत कैसे करें?",
  ],
  ar: [
    "هل يحق لصاحب العمل مصادرة جوازي؟",
    "ما هي حقوقي إذا تأخر الراتب؟",
    "هل رسوم التوظيف قانونية؟",
    "هل يمكنني تغيير العمل في هذا البلد؟",
    "ماذا أفعل إذا خالف صاحب العمل العقد؟",
    "كيف أقدم شكوى ضد صاحب العمل؟",
  ],
  fil: [
    "Maaari bang kunin ng employer ang aking pasaporte?",
    "Ano ang aking mga karapatan kung mabagal ang sahod?",
    "Legal ba ang recruitment fees?",
    "Maaari ba akong magpalit ng trabaho dito?",
    "Ano ang gagawin kung labagin ng employer ang kontrata?",
    "Paano magreklamo laban sa employer?",
  ],
  bn: [
    "নিয়োগকর্তা কি আমার পাসপোর্ট জব্দ করতে পারেন?",
    "বেতন দেরি হলে আমার কী অধিকার আছে?",
    "নিয়োগ ফি কি আইনি?",
    "এই দেশে কি চাকরি পরিবর্তন করতে পারব?",
    "নিয়োগকর্তা চুক্তি ভাঙলে কী করব?",
    "নিয়োগকর্তার বিরুদ্ধে অভিযোগ কীভাবে করব?",
  ],
};

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are MigrantShield Legal Assistant — a specialized AI assistant for migrant workers.

Your role:
- Answer questions about labor rights, employment contracts, wages, passport confiscation, recruitment fees, job changes, and workplace abuse
- Focus on general international labor standards (ILO conventions) and common destination countries (UAE, Qatar, Saudi Arabia, Malaysia, Hong Kong, Singapore)
- Be practical, clear, and empathetic — users are often in vulnerable situations

Critical rules:
- MANDATORY: If the user asks about changing jobs, transferring employers, "can I change jobs in this country", switching sponsors, or leaving their current employer for another one, and no destination country has been named anywhere in this conversation yet, your ENTIRE reply must be ONLY a short question asking which country they are in or planning to work in. Do NOT give any general rules, do NOT give a Legal References section, do NOT mention ILO conventions in this reply — just ask the country. Example: user asks "Can I change jobs in this country?" with no country mentioned → your full reply is exactly: "Which country are you currently working in, or planning to move to? Job-change rules are very different from country to country, so I want to give you the correct answer." Once the user names a country in ANY message, answer specifically for that country's job-change/transfer rules going forward.
- ALWAYS respond in the SAME language the user wrote in — if they write in Nepali, reply in Nepali; Hindi in Hindi; Arabic in Arabic; etc.
- If unsure of language, default to English
- Never refuse to answer labor rights questions
- Keep answers concise but complete — use numbered steps when explaining processes
- Always mention: "consult a qualified lawyer or your country's embassy for your specific situation" when giving legal advice
- Never make up specific laws — speak in terms of general rights and common practices
- ONLY cite laws and article numbers that appear VERBATIM in the corpus above. If corpus lacks specific articles, say 'refer to [law_title] for details' — never invent article numbers
- Be warm and supportive — these are real people facing real problems
- Structure responses as plain conversational paragraphs (no numbered steps).
- Only when the user's question actually concerns a labor right, law, or regulation, end your response with a "📜 Legal References:" section as bullet points citing only relevant laws/conventions from the corpus.
- Do NOT include a Legal References section for messages that are not substantive legal questions — e.g. greetings, thanks, acknowledgements, small talk, or follow-up chit-chat. A reply like "You're welcome" or "Thank you" must NOT have a Legal References section.
- Never fabricate law names or article numbers.`;

// ─── Format timestamp ─────────────────────────────────────────────────────────
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Format message content ───────────────────────────────────────────────────
function formatMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const parts = numberedMatch[2].split(/\*\*(.+?)\*\*/g);
      return (
        <div key={i} className="flex items-start gap-2.5 my-1.5">
          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            {numberedMatch[1]}
          </span>
          <span>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
            )}
          </span>
        </div>
      );
    }
    // Bullet list
    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      const parts = bulletMatch[1].split(/\*\*(.+?)\*\*/g);
      return (
        <div key={i} className="flex items-start gap-2 my-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2" />
          <span>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
            )}
          </span>
        </div>
      );
    }
    // Heading
    const headingMatch = line.match(/^###\s+(.+)/);
    if (headingMatch) {
      return (
        <p
          key={i}
          className="font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1"
        >
          {headingMatch[1]}
        </p>
      );
    }
    // Bold line
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <p key={i} className="font-semibold mt-2.5 mb-0.5">
          {boldMatch[1]}
        </p>
      );
    }
    // Inline bold
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="leading-relaxed">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
          )}
        </p>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="leading-relaxed">
        {line}
      </p>
    );
  });
}

// ─── Language Selector Card ───────────────────────────────────────────────────
function LanguageSelectorCard({
  onSelect,
  t,
}: {
  onSelect: (lang: LangCode) => void;
  t: typeof translations.en.chatPage;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-4 flex flex-col">
        <div className="mb-5 text-center mt-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-lg mb-4 mx-auto">
            <Shield size={24} className="text-white dark:text-slate-900" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t.pickerHeading}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t.pickerSub}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className="group flex flex-col items-center gap-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-900 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150 active:scale-95"
            >
              <img
                src={`https://flagcdn.com/32x24/${lang.countryCode}.png`}
                width={32}
                height={24}
                alt={lang.name}
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

function detectLang(text: string, currentLang?: LangCode): LangCode | null {
  if (/[\u0900-\u097F]/.test(text)) return currentLang === "ne" ? "ne" : "hi";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GeneralChatPage() {
  const router = useRouter();

  const [selectedLang, setSelectedLang] = useState<LangCode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSuggested, setShowSuggested] = useState(true);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);

  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored) setLang(stored);
  }, []);
  const t = translations[lang].chatPage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLangSelect = (lang: LangCode) => {
    setSelectedLang(lang);
    setShowLangPicker(false);
    const l = LANGUAGES.find((x) => x.code === lang)!;
    setMessages([
      {
        role: "assistant",
        content: l.welcome,
        timestamp: new Date(),
        feedback: null,
      },
    ]);
    setShowSuggested(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    const stored = localStorage.getItem("lang") as LangCode | null;
    if (stored && stored !== "en") {
      handleLangSelect(stored);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("lang") as LangCode | null;
      if (stored) handleLangSelect(stored);
    };
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang =
      selectedLang === "ar"
        ? "ar-SA"
        : selectedLang === "ne"
          ? "ne-NP"
          : selectedLang === "hi"
            ? "hi-IN"
            : selectedLang === "bn"
              ? "bn-BD"
              : selectedLang === "fil"
                ? "fil-PH"
                : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput ?? input).trim();
      const detected = detectLang(text, selectedLang ?? undefined);
      const isLatin = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text);
      if (detected && detected !== selectedLang) {
        setSelectedLang(detected);
      } else if (
        !detected &&
        isLatin &&
        selectedLang !== "en" &&
        selectedLang !== "fil"
      ) {
        setSelectedLang("en");
      }
      if (!text || loading) return;

      setInput("");
      setShowSuggested(false);

      const userMsg: ChatMessage = {
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const history = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
          }),
        });

        if (!res.ok) throw new Error("Chat API error");
        const data = await res.json();
        const reply = data.reply ?? "Sorry, I couldn't generate a response.";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            timestamp: new Date(),
            feedback: null,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            timestamp: new Date(),
            feedback: null,
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, messages],
  );

  // ── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== prev.length - 1 - idx);
    });
    await handleSend(lastUser.content);
  }, [messages, handleSend]);

  // ── Copy ───────────────────────────────────────────────────────────────────
  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ── Feedback ───────────────────────────────────────────────────────────────
  const setFeedback = (index: number, type: "up" | "down") => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, feedback: m.feedback === type ? null : type } : m,
      ),
    );
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearChat = () => {
    if (!selectedLang) return;
    const l = LANGUAGES.find((x) => x.code === selectedLang)!;
    setMessages([
      {
        role: "assistant",
        content: l.welcome,
        timestamp: new Date(),
        feedback: null,
      },
    ]);
    setShowSuggested(true);
  };

  const currentLang = LANGUAGES.find((l) => l.code === selectedLang);
  const suggested = selectedLang ? SUGGESTED[selectedLang] : [];

  return (
    <div className="flex flex-col h-[calc(100svh-56px)] pb-12 bg-slate-50 dark:bg-[#0a0f1a]">
      <div className="max-w-6xl mx-auto w-full px-4 flex flex-col flex-1 min-h-0">
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-3 py-3 mt-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-m font-semibold text-slate-900 dark:text-white truncate">
              {t.headerTitle}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t.headerSubtitle}
              </p>
            </div>
          </div>

          {/* Language pill — shows selected lang, click to re-pick */}
          {selectedLang && currentLang && (
            <button
              onClick={() => setShowLangPicker(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 transition-colors text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0"
            >
              <img
                src={`https://flagcdn.com/16x12/${currentLang.countryCode}.png`}
                width={16}
                height={12}
                alt={currentLang.name}
                className="rounded-sm"
              />
              <span>{currentLang.native}</span>
              <Globe size={11} className="text-slate-400" />
            </button>
          )}

          {selectedLang && (
            <button
              onClick={clearChat}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Clear chat"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {/* ── Language re-picker overlay ───────────────────────────────────── */}
        {showLangPicker && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.changeLangHeading}
                </h3>
                <button
                  onClick={() => setShowLangPicker(false)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  {t.cancel}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      handleLangSelect(lang.code);
                      setShowLangPicker(false);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${
                      selectedLang === lang.code
                        ? "border-slate-900 dark:border-slate-400 bg-slate-50 dark:bg-slate-800"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/32x24/${lang.countryCode}.png`}
                      width={32}
                      height={24}
                      alt={lang.name}
                      className="rounded-sm"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {lang.native}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Main content area ────────────────────────────────────────────── */}
        {!selectedLang ? (
          <LanguageSelectorCard onSelect={handleLangSelect} t={t} />
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Disclaimer */}
            <div className="shrink-0 px-2 py-2">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center leading-snug max-w-2xl mx-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-2.5">
                {currentLang?.disclaimer ??
                  "⚖️ AI-generated legal information, not legal advice. Consult a qualified lawyer or your country's embassy for your specific situation."}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 py-4 space-y-4 pb-4">
              {/* Suggested questions */}
              {showSuggested && messages.length <= 1 && (
                <div className="pt-2 pb-1">
                  <p className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-3 px-1">
                    {t.suggestedLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggested.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="text-sm px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left leading-snug"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0 mb-6">
                      <Shield size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 mb-6">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-slate-900 dark:bg-teal-700 text-white rounded-br-sm"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm"
                      }`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {msg.role === "assistant"
                        ? formatMessage(msg.content)
                        : msg.content}
                    </div>

                    {/* Timestamp + actions */}
                    <div
                      className={`flex items-center gap-2 px-1 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {formatTime(msg.timestamp)}
                      </span>

                      {msg.role === "assistant" && i > 0 && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => copyMessage(msg.content, i)}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                              copiedIndex === i
                                ? "text-emerald-500"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {copiedIndex === i ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>

                          <button
                            onClick={() => setFeedback(i, "up")}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                              msg.feedback === "up"
                                ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <ThumbsUp size={12} />
                          </button>

                          <button
                            onClick={() => setFeedback(i, "down")}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                              msg.feedback === "down"
                                ? "text-red-500 bg-red-50 dark:bg-red-900/30"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <ThumbsDown size={12} />
                          </button>

                          {i === messages.length - 1 && (
                            <button
                              onClick={handleRegenerate}
                              disabled={loading}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading bubble */}
              {loading && (
                <div className="flex items-end gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input area ──────────────────────────────────────────────── */}
            <div className="shrink-0 py-3">
              <div className="relative w-full">
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
                  placeholder={
                    currentLang?.placeholder ??
                    "Ask anything about your rights…"
                  }
                  rows={1}
                  maxLength={500}
                  disabled={loading}
                  className="w-full resize-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-4 pr-36 pt-4 pb-8 shadow-sm text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all leading-relaxed disabled:opacity-50"
                  style={{ maxHeight: "160px", overflowY: "auto" }}
                />
                {/* Bottom bar inside textarea */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  {/* Counter */}
                  <span
                    className={`text-[11px] tabular-nums pointer-events-none ${
                      input.length >= 500
                        ? "text-red-400"
                        : input.length > 400
                          ? "text-amber-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {input.length}/500
                  </span>
                  {/* mic + send */}
                  <div className="flex items-center gap-1 pointer-events-auto">
                    <button
                      onClick={handleVoice}
                      disabled={loading}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                        isListening
                          ? "text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                      title="Voice input"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleSend()}
                      disabled={loading || !input.trim()}
                      className="w-9 h-9 bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-1.5">
                {t.inputFooter}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
