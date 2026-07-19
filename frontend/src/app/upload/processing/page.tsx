"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBrowserClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

type PollingStatus = "polling" | "completed" | "failed" | "timeout";

interface StatusResponse {
  contract_id: string;
  status: string;
  risk_score: number | null;
  error: string | null;
}

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const contractId = searchParams.get("id");

  const [pollingStatus, setPollingStatus] = useState<PollingStatus>("polling");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<"en" | "ne">("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "ne") setUiLang("ne");
    const sync = () =>
      setUiLang(localStorage.getItem("lang") === "ne" ? "ne" : "en");
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearAllTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  };

  useEffect(() => {
    if (!contractId) return;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        } else {
          const guestId = localStorage.getItem("guest_id");
          if (guestId) headers["X-Guest-ID"] = guestId;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/status/${contractId}`,
          { method: "GET", headers },
        );

        if (!response.ok) return;
        const data: StatusResponse = await response.json();
        if (!isMounted) return;

        if (data.status === "completed") {
          clearAllTimers();
          setPollingStatus("completed");
          setTimeout(() => router.push(`/report/${contractId}`), 1200);
          return;
        }
        if (data.status === "failed") {
          clearAllTimers();
          setErrorMessage(
            data.error ?? "Analysis pipeline encountered an error.",
          );
          setPollingStatus("failed");
        }
      } catch (err) {
        console.warn("[MigrantShield] Poll network error:", err);
      }
    };

    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    elapsedIntervalRef.current = setInterval(
      () => setElapsedSeconds((p) => p + 1),
      1000,
    );
    timeoutRef.current = setTimeout(() => {
      if (!isMounted) return;
      clearAllTimers();
      setPollingStatus("timeout");
    }, POLL_TIMEOUT_MS);

    return () => {
      isMounted = false;
      clearAllTimers();
    };
  }, [contractId, user]);

  const progressPct = Math.min(
    Math.round((elapsedSeconds / (POLL_TIMEOUT_MS / 1000)) * 92),
    92,
  );

  useEffect(() => {
    if (!contractId) router.replace("/upload");
  }, [contractId]);

  if (!contractId) return null;

  // --------------------------------------------------------------------------
  // Timeout state
  // --------------------------------------------------------------------------
  if (pollingStatus === "timeout") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              {uiLang === "ne" ? "विश्लेषण समय सकियो" : "Analysis Timed Out"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {uiLang === "ne"
                ? "विश्लेषण पाइपलाइनले अपेक्षित समयमा प्रतिक्रिया दिएन।"
                : "The analysis pipeline did not respond within the expected window."}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {uiLang === "ne"
                    ? "प्रशोधन समय सकियो — ९० सेकेन्ड बढी भयो"
                    : "Processing timeout — 90 seconds exceeded"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {uiLang === "ne"
                    ? "तपाईंको सम्झौता सफलतापूर्वक अपलोड भयो। AI विश्लेषण इन्जिन अपेक्षाभन्दा बढी समय लिइरहेको छ।"
                    : "Your contract was uploaded successfully. The AI analysis engine is taking longer than expected. This is usually caused by high server load or a large document."}
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">Reference ID</p>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 break-all">
                {contractId}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
              {uiLang === "ne"
                ? "तपाईंको विश्लेषण पृष्ठभूमिमा अझै पूरा हुन सक्छ। केही मिनेटमा ड्यासबोर्ड जाँच गर्नुहोस्।"
                : "Your analysis may still complete in the background. Check your dashboard in a few minutes, or retry the analysis below."}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 px-4 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              {uiLang === "ne" ? "ड्यासबोर्डमा जानुहोस्" : "Go to Dashboard"}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {uiLang === "ne" ? "पुनः पोलिङ गर्नुहोस्" : "Retry Polling"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Failed state
  // --------------------------------------------------------------------------
  if (pollingStatus === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              {uiLang === "ne" ? "विश्लेषण असफल भयो" : "Analysis Failed"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {uiLang === "ne"
                ? "AI विश्लेषण पाइपलाइनले तपाईंको सम्झौता प्रशोधन गर्दा त्रुटि भयो।"
                : "The AI analysis pipeline encountered an error processing your contract."}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {uiLang === "ne"
                    ? "विश्लेषण पाइपलाइन त्रुटि"
                    : "Analysis pipeline error"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {uiLang === "ne"
                    ? "तपाईंको फाइल सुरक्षित रूपमा अपलोड भयो तर विश्लेषण गर्न सकिएन।"
                    : "Your file was uploaded securely but could not be analysed. Please try uploading again. If this persists, contact support."}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">Reference ID</p>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 break-all">
                {contractId}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/upload")}
              className="w-full py-2.5 px-4 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              {uiLang === "ne" ? "फेरि अपलोड गर्नुहोस्" : "Upload Again"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {uiLang === "ne" ? "ड्यासबोर्डमा जानुहोस्" : "Go to Dashboard"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Active polling state
  // --------------------------------------------------------------------------
  const steps = [
    {
      id: 1,
      label:
        uiLang === "ne" ? "कागजात पाठ निकाल्दै" : "Extracting contract text",
      sublabel:
        uiLang === "ne"
          ? "PDF, स्क्यान वा तस्बिरबाट पाठ पढ्दैछ"
          : "Reads text from PDF, scanned image, or photographed contract",
      completeAt: 15,
    },
    {
      id: 2,
      label:
        uiLang === "ne"
          ? "RAG — कानुनी कोर्पस खोज"
          : "RAG retrieval — legal corpus",
      sublabel:
        uiLang === "ne"
          ? "pgvector मा ५२९ कानुन खण्डहरू खोजिँदै"
          : "pgvector similarity search across 529 law chunks",
      completeAt: 30,
    },
    {
      id: 3,
      label:
        uiLang === "ne"
          ? "AI विश्लेषण — Groq LLaMA 3.3 70B"
          : "AI analysis — Groq LLaMA 3.3 70B",
      sublabel:
        uiLang === "ne"
          ? "खण्ड-दर-खण्ड जोखिम पहिचान"
          : "Clause-by-clause risk detection + legal grounding",
      completeAt: 70,
    },
    {
      id: 4,
      label: uiLang === "ne" ? "बहुभाषिक अनुवाद" : "Multilingual translation",
      sublabel:
        uiLang === "ne"
          ? "नेपाली · हिन्दी · अरबी · फिलिपिनो · बंगाली"
          : "Nepali · Hindi · Arabic · Filipino · Bengali",
      completeAt: 85,
    },
    {
      id: 5,
      label: uiLang === "ne" ? "रिपोर्ट तयार" : "Report assembly",
      sublabel:
        uiLang === "ne"
          ? "खण्डहरू ढाँचा मिलाउँदै"
          : "Formatting sections, emergency contacts, PDF layout",
      completeAt: 95,
    },
  ];

  const getStepState = (completeAt: number, nextCompleteAt?: number) => {
    if (pollingStatus === "completed") return "done";
    if (progressPct >= completeAt) return "done";
    if (nextCompleteAt && progressPct >= completeAt - 10) return "active";
    if (progressPct >= completeAt - 15) return "active";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium mb-3 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {uiLang === "ne" ? "रद्द गरी फिर्ता" : "Cancel & go back"}
          </button>
          <p className="text-xs font-medium text-teal-600 uppercase tracking-widest mb-2">
            {uiLang === "ne" ? "विश्लेषण" : "Contract Review"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {uiLang === "ne"
              ? "सम्झौता विश्लेषण हुँदै"
              : "Analysing your contract"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {uiLang === "ne"
              ? "कृपया यो स्क्रिन खुला राख्नुहोस्।"
              : "Keep this screen open — results arrive in 15–45 seconds."}
          </p>
        </div>

        {/* 5-step pipeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          {steps.map((step, idx) => {
            const state = getStepState(
              step.completeAt,
              steps[idx + 1]?.completeAt,
            );
            return (
              <div key={step.id} className="flex gap-3 mb-5 last:mb-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      state === "done"
                        ? "bg-teal-500 border-teal-500"
                        : state === "active"
                          ? "bg-white dark:bg-slate-900 border-teal-400 animate-pulse"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {state === "done" ? (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    ) : (
                      <span
                        className={`text-xs font-semibold ${state === "active" ? "text-teal-500" : "text-slate-400 dark:text-slate-500"}`}
                      >
                        {step.id}
                      </span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 mt-1 min-h-[20px] transition-all duration-500 ${
                        state === "done"
                          ? "bg-teal-400"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p
                    className={`text-sm font-medium transition-colors duration-300 ${
                      state === "done"
                        ? "text-slate-800 dark:text-slate-100"
                        : state === "active"
                          ? "text-teal-600"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {step.sublabel}
                  </p>
                  {state === "active" && (
                    <div className="mt-1.5 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-1 bg-teal-500 rounded-full animate-[progressIndeterminate_1.5s_ease-in-out_infinite]"
                        style={{ width: "60%" }}
                      />
                    </div>
                  )}
                  {state === "done" && (
                    <div className="mt-1.5 h-1 w-full bg-teal-100 dark:bg-teal-900/30 rounded-full">
                      <div className="h-1 bg-teal-400 rounded-full w-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall progress */}
        <div className="mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {pollingStatus === "completed"
                ? uiLang === "ne"
                  ? "विश्लेषण पूरा भयो"
                  : "Analysis complete — redirecting…"
                : uiLang === "ne"
                  ? "विश्लेषण जारी छ..."
                  : "Analysing…"}
            </span>
            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {elapsedSeconds}s
            </span>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-1 bg-teal-500 rounded-full transition-all duration-1000 ease-in-out"
              style={{
                width:
                  pollingStatus === "completed" ? "100%" : `${progressPct}%`,
              }}
            />
          </div>
        </div>

        {/* Reference ID */}
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs text-slate-400">
            {uiLang === "ne" ? "सन्दर्भ ID" : "Reference ID"}
          </p>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 break-all ml-4 text-right">
            {contractId}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-xs text-teal-700/70 dark:text-teal-500/70 text-center leading-relaxed">
          {uiLang === "ne"
            ? "हाम्रो AI इन्जिनले अन्तर्राष्ट्रिय श्रम कानून मानकहरू विरुद्ध मूल्यांकन गर्दैछ।"
            : "Checked against international labour law standards — ILO conventions and bilateral agreements."}
        </p>
      </main>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
