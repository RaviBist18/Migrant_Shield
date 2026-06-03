"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  BookOpen,
  Shield,
  RefreshCw,
  ChevronRight,
  FileText,
} from "lucide-react";
import React from 'react';

// =============================================================
// TYPES
// =============================================================
interface ContractFlag {
  flag_id: string;
  contract_id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  title: string;
  contract_clause: string;
  plain_language_explanation: string;
  mitigation_steps: string[] | string;
  legal_references: string[] | string;
  ai_confidence: number;
}

// =============================================================
// HELPERS
// =============================================================
function severityStyles(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        badge: "bg-red-100 text-red-700 border border-red-200",
        bar: "bg-red-400",
        quoteBorder: "border-l-red-400",
        icon: <XCircle className="w-5 h-5 text-red-500" />,
      };
    case "WARNING":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border border-amber-200",
        bar: "bg-amber-400",
        quoteBorder: "border-l-amber-400",
        icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      };
    default:
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        bar: "bg-emerald-400",
        quoteBorder: "border-l-emerald-400",
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      };
  }
}

function toArray(val: string[] | string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [val];
}

// =============================================================
// COMPONENT
// =============================================================
export default function FlagDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [session, setSession] = useState<any>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });
  return () => subscription.unsubscribe();
}, []);
  const contractId = params?.id as string;
  const issueId    = params?.issue_id as string;

  const [flag, setFlag]         = useState<ContractFlag | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Flag as incorrect state
  const [showFeedback, setShowFeedback]       = useState(false);
  const [feedbackText, setFeedbackText]       = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError]     = useState<string | null>(null);

  // =============================================================
  // HARDWARE BACK-BUTTON GUARD
  // =============================================================
  useEffect(() => {
    const handlePopState = () => {
      router.push(`/report/${contractId}`);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [contractId, router]);

  // =============================================================
  // FETCH FLAG
  // =============================================================
  const fetchFlag = useCallback(async () => {
    if (!session?.access_token || !issueId) return;

    try {
      setError(null);
      const { data, error: dbError } = await supabase
        .from("contract_flags")
        .select("*")
        .eq("flag_id", issueId)
        .eq("contract_id", contractId)
        .single();

      if (dbError) throw new Error("Flag not found or access denied.");
      if (!data)   throw new Error("Flag not found.");
      setFlag(data as ContractFlag);
    } catch (err: any) {
      setError(err.message || "Failed to load flag details.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, issueId, contractId, supabase]);

  useEffect(() => {
    fetchFlag();
  }, [fetchFlag]);

  // =============================================================
  // SUBMIT FEEDBACK — "Flag as incorrect"
  // =============================================================
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !session?.access_token) return;
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const { error: insertError } = await supabase
        .from("flag_feedback")
        .insert({
          flag_id:     issueId,
          contract_id: contractId,
          feedback:    feedbackText.trim(),
          created_at:  new Date().toISOString(),
        });

      if (insertError) throw new Error(insertError.message);
      setFeedbackSuccess(true);
      setShowFeedback(false);
      setFeedbackText("");
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  // =============================================================
  // RENDER STATES
  // =============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Loading flag details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Failed to Load
          </h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setLoading(true); fetchFlag(); }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={() => router.push(`/report/${contractId}`)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Back to Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!flag) return null;

  const ss              = severityStyles(flag.severity);
  const mitigationSteps = toArray(flag.mitigation_steps);
  const legalRefs       = toArray(flag.legal_references);

  // =============================================================
  // MAIN RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* --------------------------------------------------------
          LEGAL BANNER — non-dismissible
      -------------------------------------------------------- */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-xs">
            <span className="font-bold">Not Legal Advice.</span>{" "}
            AI-generated analysis only. Consult a legal professional.
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------
          BACK NAV
      -------------------------------------------------------- */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <button
          onClick={() => router.push(`/report/${contractId}`)}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Report
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* -------------------------------------------------------
            SEVERITY HEADER BLOCK
        ------------------------------------------------------- */}
        <div className={`rounded-xl border ${ss.bg} ${ss.border} p-5`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{ss.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ss.badge}`}>
                  {flag.severity}
                </span>
                <span className="text-xs text-slate-500">{flag.category}</span>
              </div>
              <h1 className={`text-base font-bold leading-snug ${ss.text}`}>
                {flag.title}
              </h1>

              {/* Confidence bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-1.5 border border-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ss.bar}`}
                    style={{ width: `${Math.round(flag.ai_confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {Math.round(flag.ai_confidence * 100)}% AI confidence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------
            QUOTED CLAUSE BLOCK
        ------------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Extracted Contract Clause
            </h2>
          </div>
          <blockquote
            className={`border-l-4 ${ss.quoteBorder} bg-slate-50 dark:bg-slate-800/50 rounded-r-lg px-4 py-3`}
          >
            <p className="text-slate-700 text-sm leading-relaxed italic">
              {flag.contract_clause
                ? `"${flag.contract_clause}"`
                : "No clause text was extracted for this flag."}
            </p>
          </blockquote>
        </div>

        {/* -------------------------------------------------------
            PLAIN LANGUAGE EXPLANATION
        ------------------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Plain Language Explanation
            </h2>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            {flag.plain_language_explanation || "No explanation available."}
          </p>
        </div>

        {/* -------------------------------------------------------
            MITIGATION STEPS
        ------------------------------------------------------- */}
        {mitigationSteps.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                What You Can Do
              </h2>
            </div>
            <ol className="space-y-3">
              {mitigationSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-slate-700 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* -------------------------------------------------------
            LEGAL REFERENCES
        ------------------------------------------------------- */}
        {legalRefs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Statutory Legal References
              </h2>
            </div>
            <ul className="space-y-2">
              {legalRefs.map((ref, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                >
                  <span className="text-slate-400 text-xs mt-0.5 flex-shrink-0">§</span>
                  <p className="text-slate-700 text-sm leading-snug">{ref}</p>
                </li>
              ))}
            </ul>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              References are AI-generated and may not be complete or jurisdiction-specific.
              Verify all citations with a qualified legal professional.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------
            FLAG AS INCORRECT
        ------------------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Flag as Incorrect
              </h2>
            </div>
            {!showFeedback && !feedbackSuccess && (
              <button
                onClick={() => setShowFeedback(true)}
                className="text-xs text-slate-500 hover:text-slate-900 underline transition-colors"
              >
                Report issue
              </button>
            )}
          </div>

          {feedbackSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mt-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-emerald-700 text-xs font-medium">
                Feedback submitted. Thank you for helping improve accuracy.
              </p>
            </div>
          )}

          {!feedbackSuccess && (
            <p className="text-slate-500 text-xs leading-relaxed">
              If this flag appears incorrect or irrelevant, report it so our team
              can improve the AI model.
            </p>
          )}

          {showFeedback && !feedbackSuccess && (
            <div className="mt-3 space-y-3">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe why this flag is incorrect or misleading..."
                rows={3}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 resize-none"
              />
              {feedbackError && (
                <p className="text-red-600 text-xs">{feedbackError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackLoading || !feedbackText.trim()}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  {feedbackLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowFeedback(false);
                    setFeedbackText("");
                    setFeedbackError(null);
                  }}
                  className="px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------
            BOTTOM DISCLAIMER
        ------------------------------------------------------- */}
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-slate-500 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600">
              Automated Translation Aid Only — Not Legal Advice.
            </span>{" "}
            This flag was identified by an AI model and may not reflect your specific
            legal jurisdiction. Always seek qualified legal assistance before acting
            on any finding in this report.
          </p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}