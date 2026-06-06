"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  XCircle,
  RefreshCw,
  Trash2,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Clock,
  Calendar,
  HardDrive,
  Shield,
  Info,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

// =============================================================
// TYPES
// =============================================================
interface FailedContract {
  contract_id: string;
  original_filename: string | null;
  file_name: string | null;
  file_size: number | null;
  upload_date: string | null;
  created_at: string | null;
  error_reason: string | null;
  status: string;
  worker_name: string | null;
  employer_name: string | null;
  country: string | null;
  mime_type: string | null;
}

// =============================================================
// HELPERS
// =============================================================
function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseErrorType(reason: string | null): {
  code: string;
  title: string;
  explanation: string;
  suggestion: string;
} {
  if (!reason)
    return {
      code: "UNKNOWN",
      title: "Unknown Error",
      explanation: "An unexpected error occurred during analysis.",
      suggestion:
        "Try retrying the analysis. If the problem persists, re-upload the contract.",
    };

  const r = reason.toLowerCase();

  if (r.includes("429") || r.includes("rate limit") || r.includes("quota"))
    return {
      code: "RATE_LIMIT",
      title: "AI Quota Exceeded",
      explanation:
        "The AI analysis service hit its request limit (HTTP 429). This happens when too many contracts are processed in a short time.",
      suggestion:
        "Wait a few minutes then retry. If this keeps happening, the daily quota may be exhausted — try again tomorrow or contact support.",
    };

  if (r.includes("parse") || r.includes("json") || r.includes("decode"))
    return {
      code: "PARSE_ERROR",
      title: "Response Parse Error",
      explanation:
        "The AI returned a response that could not be interpreted correctly. This may indicate the contract format was unusual or the AI response was malformed.",
      suggestion:
        "Retry the analysis. If it fails again, try re-uploading the contract as a cleaner PDF.",
    };

  if (r.includes("timeout") || r.includes("timed out"))
    return {
      code: "TIMEOUT",
      title: "Analysis Timed Out",
      explanation:
        "The AI analysis took too long to complete. This can happen with very large or complex contracts.",
      suggestion:
        "Retry the analysis. Large files may take longer — ensure the file is not corrupted or excessively large.",
    };

  if (r.includes("groq") || r.includes("gemini") || r.includes("model"))
    return {
      code: "MODEL_ERROR",
      title: "AI Model Error",
      explanation:
        "The AI model encountered an internal error while processing this contract.",
      suggestion:
        "Retry the analysis. If the issue persists, the AI service may be temporarily unavailable.",
    };

  if (r.includes("storage") || r.includes("download") || r.includes("file"))
    return {
      code: "STORAGE_ERROR",
      title: "File Access Error",
      explanation:
        "The contract file could not be retrieved from storage for analysis.",
      suggestion:
        "Try re-uploading the contract and submitting it for analysis again.",
    };

  return {
    code: "GENERAL_ERROR",
    title: "Analysis Failed",
    explanation: reason,
    suggestion:
      "Retry the analysis. If the problem persists, try re-uploading the contract.",
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// =============================================================
// COMPONENT
// =============================================================
export default function FailedContractPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const contractId = params?.id as string;

  const [contract, setContract] = useState<FailedContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const fetchContract = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/phone");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("contracts")
        .select(
          "contract_id, original_filename, file_name, file_size, upload_date, created_at, error_reason, status, worker_name, employer_name, country, mime_type",
        )
        .eq("contract_id", contractId)
        .eq("user_id", user.id)
        .single();

      if (dbError || !data) throw new Error("Contract not found.");
      if (data.status !== "failed") {
        // Redirect if not actually failed
        if (data.status === "completed")
          router.replace(`/report/${contractId}`);
        else router.replace("/history");
        return;
      }
      setContract(data);
    } catch (err: any) {
      setError(err.message || "Failed to load contract.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleRetry = async () => {
    if (!session?.access_token) return;
    setRetrying(true);
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/reanalyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Retry failed");
      showToast("Contract requeued for analysis.");
      router.replace("/history");
    } catch {
      showToast("Retry failed. Please try again.", "error");
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this contract? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const { error: dbError } = await supabase
        .from("contracts")
        .delete()
        .eq("contract_id", contractId);
      if (dbError) throw new Error("Delete failed");
      showToast("Contract deleted.");
      router.replace("/history");
    } catch {
      showToast("Delete failed. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // =============================================================
  // LOADING
  // =============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading...
          </p>
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
            Not Found
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {error}
          </p>
          <button
            onClick={() => router.replace("/history")}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const errInfo = parseErrorType(contract.error_reason);
  const displayName =
    contract.original_filename ?? contract.file_name ?? "Unknown file";
  const uploadDate = contract.upload_date
    ? new Date(contract.upload_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";
  const uploadTime = contract.upload_date
    ? new Date(contract.upload_date).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // =============================================================
  // MAIN RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* BACK */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* HERO — failed state header */}
        <div className="bg-white dark:bg-[#0f172a] border border-red-200 dark:border-red-900/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            {/* File icon */}
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-red-400 dark:text-red-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate leading-tight">
                    {displayName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {contract.file_size && (
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <HardDrive className="w-3 h-3" />
                        {formatBytes(contract.file_size)}
                      </span>
                    )}
                    {contract.mime_type && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-mono">
                        {contract.mime_type.split("/").pop()}
                      </span>
                    )}
                    {contract.worker_name && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {contract.worker_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Failed badge */}
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full shrink-0">
                  <XCircle className="w-3.5 h-3.5" /> Failed
                </span>
              </div>

              {/* Date + time */}
              <div className="flex items-center gap-1.5 mt-3">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Uploaded {uploadDate}
                  {uploadTime ? ` at ${uploadTime}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR BREAKDOWN */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Red accent top */}
          <div className="h-0.5 bg-red-500" />

          <div className="p-5 space-y-4">
            {/* Error code + title */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {errInfo.title}
                  </h2>
                  <span className="text-[10px] font-mono font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded">
                    {errInfo.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Analysis could not be completed
                </p>
              </div>
            </div>

            {/* Raw error */}
            {contract.error_reason && (
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Raw Error
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300 break-all">
                  {contract.error_reason}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                What happened
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3.5 border-l border-slate-200 dark:border-slate-800">
                {errInfo.explanation}
              </p>
            </div>

            {/* Suggestion */}
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                What you can do
              </p>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {errInfo.suggestion}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT METADATA (if any) */}
        {(contract.worker_name ||
          contract.employer_name ||
          contract.country) && (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Contract Details
            </p>
            {contract.worker_name && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">
                  Worker
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {contract.worker_name}
                </span>
              </div>
            )}
            {contract.employer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">
                  Employer
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {contract.employer_name}
                </span>
              </div>
            )}
            {contract.country && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">
                  Country
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {contract.country}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            disabled={retrying || deleting}
            className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`}
            />
            {retrying ? "Retrying…" : "Retry Analysis"}
          </button>
          <button
            onClick={handleDelete}
            disabled={retrying || deleting}
            className="flex-1 bg-white dark:bg-[#0f172a] hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className={`w-4 h-4 ${deleting ? "animate-pulse" : ""}`} />
            {deleting ? "Deleting…" : "Delete Contract"}
          </button>
        </div>

        {/* BOTTOM NOTE */}
        <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Note:{" "}
            </span>
            Failed contracts are not deleted automatically. You can retry the
            analysis or delete the contract. Retrying will requeue the contract
            for AI analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
