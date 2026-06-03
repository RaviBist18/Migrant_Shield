"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBrowserClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const dynamic = "force-dynamic";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PollingStatus = "polling" | "completed" | "failed" | "timeout";

interface StatusResponse {
  contract_id: string;
  status: string;
  risk_score: number | null;
  error_reason: string | null;
}

// ---------------------------------------------------------------------------
// ProcessingContent
// ---------------------------------------------------------------------------
function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const contractId = searchParams.get("id");

  // ALL hooks declared before any conditional return
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>("polling");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    // Guard inside effect — safe, doesn't break hook rules
    if (!user || !contractId) return;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          clearAllTimers();
          router.replace("/");
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/status/${contractId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          console.warn(
            `[MigrantShield] Status poll returned ${response.status}`,
          );
          return;
        }

        const data: StatusResponse = await response.json();
        if (!isMounted) return;

        if (data.status === "completed") {
          clearAllTimers();
          setPollingStatus("completed");
          setTimeout(() => {
            router.push(`/report/${contractId}`);
          }, 1200);
          return;
        }

        if (data.status === "failed") {
          clearAllTimers();
          setErrorMessage(
            data.error_reason ?? "Analysis pipeline encountered an error.",
          );
          setPollingStatus("failed");
          return;
        }
      } catch (err) {
        console.warn("[MigrantShield] Poll network error:", err);
      }
    };

    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

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

  // Progress bar — time-based, caps at 92%
  const progressPct = Math.min(
    Math.round((elapsedSeconds / (POLL_TIMEOUT_MS / 1000)) * 92),
    92,
  );

  // Guards AFTER all hooks
  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  useEffect(() => {
    if (!contractId) router.replace("/upload");
  }, [contractId]);

  if (!user || !contractId) return null;

  // --------------------------------------------------------------------------
  // Timeout state
  // --------------------------------------------------------------------------
  if (pollingStatus === "timeout") {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Analysis Timed Out
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              The analysis pipeline did not respond within the expected window.
            </p>
          </div>

          <div className="bg-white border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
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
                <p className="text-sm font-semibold text-slate-800">
                  Processing timeout — 90 seconds exceeded
                </p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Your contract was uploaded successfully. The AI analysis
                  engine is taking longer than expected. This is usually caused
                  by high server load or a large document.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Reference ID</p>
              <p className="text-xs font-mono text-slate-600 mt-1 break-all">
                {contractId}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-medium text-amber-800">
              Your analysis may still complete in the background. Check your
              dashboard in a few minutes, or retry the analysis below.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Retry Polling
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
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Analysis Failed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              The AI analysis pipeline encountered an error processing your
              contract.
            </p>
          </div>

          <div className="bg-white border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
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
                <p className="text-sm font-semibold text-slate-800">
                  Analysis pipeline error
                </p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Your file was uploaded securely but could not be analysed.
                  Please try uploading again. If this persists, contact support.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-mono text-slate-500 break-all leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Reference ID</p>
              <p className="text-xs font-mono text-slate-600 mt-1 break-all">
                {contractId}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/upload")}
              className="w-full py-2.5 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              Upload Again
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Active polling state
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            Analysing Contract
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please keep this screen open. Our AI engine is scanning your
            contract for labour rights violations.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-teal-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          </div>

          <p className="text-center text-sm font-medium text-slate-600 mb-4">
            {pollingStatus === "completed"
              ? "Analysis complete. Redirecting..."
              : "AI analysis in progress..."}
          </p>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-teal-600 transition-all duration-1000 ease-in-out"
              style={{
                width:
                  pollingStatus === "completed" ? "100%" : `${progressPct}%`,
              }}
            />
          </div>

          <p className="text-right text-xs text-slate-400 mt-2">
            {elapsedSeconds}s elapsed
          </p>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">Reference ID</p>
            <p className="text-xs font-mono text-slate-600 text-center mt-1 break-all">
              {contractId}
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-slate-100 border border-slate-200">
          <p className="text-xs text-slate-500 leading-relaxed">
            Our AI engine is evaluating your contract against international
            labour law standards — checking for illegal recruitment fees,
            passport confiscation clauses, forced wage deductions, and
            termination threats. This typically takes 15–45 seconds.
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export with Suspense boundary
// ---------------------------------------------------------------------------
export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
