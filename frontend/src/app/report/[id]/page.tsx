"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Share2,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Shield,
  Clock,
} from "lucide-react";
import { translations } from '@/lib/i18n/landing';
import { useToast } from '@/context/ToastContext';
import type { Lang } from '@/lib/i18n/landing';

// =============================================================
// TYPES
// =============================================================
interface ContractFlag {
  flag_id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  title: string;
  contract_clause: string;
  plain_language_explanation: string;
  mitigation_steps: string[];
  legal_references: string[];
  ai_confidence: number;
}

interface ContractReport {
  contract_id: string;
  status: string;
  risk_score: number;
  analyzed_at: string;
  uploaded_at: string;
  report_ready: boolean;
  error: string | null;
}

interface ReportMeta {
  report_id: string;
  pdf_url: string;
  generated_at: string;
  downloaded_count: number;
}

type Verdict = "SAFE" | "CAUTION" | "CRITICAL";

// =============================================================
// HELPERS
// =============================================================
function resolveVerdict(score: number): Verdict {
  if (score >= 70) return "CRITICAL";
  if (score >= 31) return "CAUTION";
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
        icon: <XCircle className="w-6 h-6 text-red-600" />,
      };
    case "CAUTION":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      };
    case "SAFE":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle className="w-6 h-6 text-emerald-600" />,
      };
  }
}

function severityStyles(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        badge: "bg-red-100 text-red-700 border border-red-200",
        bar: "bg-red-400",
      };
    case "WARNING":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border border-amber-200",
        bar: "bg-amber-400",
      };
    default:
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        bar: "bg-emerald-400",
      };
  }
}

const CONFIDENCE_THRESHOLD = 0.85;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// =============================================================
// COMPONENT
// =============================================================
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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

  const [report, setReport] = useState<ContractReport | null>(null);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [flags, setFlags] = useState<ContractFlag[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(1.0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  

  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('lang');
      setLang(stored === 'ne' ? 'ne' : 'en');
    };
    sync();
    window.addEventListener('langchange', sync);
    return () => window.removeEventListener('langchange', sync);
  }, []);

  const t = translations[lang].report;
  const { showToast } = useToast();

  // ------------------------------------------------------------
  // FETCH REPORT DATA
  // ------------------------------------------------------------
  const fetchReport = useCallback(async () => {
    if (!session?.access_token || !contractId) return;

    try {
      setError(null);

      const statusRes = await fetch(`${API_BASE}/status/${contractId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!statusRes.ok) throw new Error("Failed to load report status.");
      const statusData: ContractReport = await statusRes.json();
      setReport(statusData);

      if (statusData.status !== "completed") {
        setLoading(false);
        return;
      }

      const metaRes = await fetch(
        `${API_BASE}/report/by-contract/${contractId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const metaBody = await metaRes.json();
      if (metaRes.ok) setReportMeta(metaBody);

      const { data: flagData, error: flagError } = await supabase
        .from("contract_flags")
        .select("*")
        .eq("contract_id", contractId)
        .order("ai_confidence", { ascending: true });

      if (flagError) throw new Error("Failed to load risk flags.");
      setFlags(flagData || []);

      if (flagData && flagData.length > 0) {
        const avg =
          flagData.reduce((sum: number, f: ContractFlag) => sum + (f.ai_confidence || 0), 0) /
          flagData.length;
        setConfidenceScore(avg);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, contractId, supabase]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ------------------------------------------------------------
  // DOWNLOAD PDF
  // ------------------------------------------------------------
  const handleDownload = async () => {
    if (!reportMeta?.report_id || !session?.access_token) return;
    setDownloadLoading(true);
    

    try {
      const res = await fetch(
        `${API_BASE}/report/${reportMeta.report_id}/download`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Download link generation failed.");
      }

      const { signed_url } = await res.json();
      window.open(signed_url, "_blank");
    } catch (err: any) {
      showToast(err.message || "Could not generate download link.", 'error');
    } finally {
      setDownloadLoading(false);
    }
  };

  // ------------------------------------------------------------
  // SHARE REPORT
  // ------------------------------------------------------------
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/report/${contractId}`;
    const shareData = {
      title: "MigrantShield Contract Report",
      text: `View my employment contract risk report — Score: ${report?.risk_score ?? "N/A"}/100`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast(t.linkCopied);
      }
    } catch (_) {}
  };

  // ------------------------------------------------------------
  // REQUEST HUMAN REVIEW
  // ------------------------------------------------------------
  const handleRequestReview = async () => {
    if (!session?.access_token || !contractId) return;
    setReviewLoading(true);
    

    try {
      const res = await fetch(`${API_BASE}/review/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contract_id: contractId,
          reason: "Worker requested human legal review from report page.",
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Review request failed.");
      setReviewSubmitted(true);
      showToast(t.reviewSubmitted);
    } catch (err: any) {
      showToast(err.message || "Could not submit review request.", 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // ------------------------------------------------------------
  // NAVIGATE TO FLAG DETAIL
  // ------------------------------------------------------------
  const handleFlagClick = (flagId: string) => {
    router.push(`/report/${contractId}/detail/${flagId}`);
  };

  // =============================================================
  // RENDER STATES
  // =============================================================

  if (!loading && report && report.status !== "completed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
          <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t.notReady}</h2>
          <p className="text-slate-600 text-sm mb-6">
            Status: <span className="font-semibold capitalize">{report.status}</span>.{" "}
            {report.status === "failed"
              ? report.error || "Processing failed."
              : t.notReadySub}
          </p>
          <div className="flex gap-3 justify-center">
            {report.status === "failed" ? (
              <button
                onClick={() => router.push("/upload")}
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {t.uploadAgain}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/upload/processing?id=${contractId}`)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {t.viewProgress}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t.failedLoad}</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchReport(); }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const verdict = resolveVerdict(report.risk_score);
  const vs = verdictStyles(verdict);
  const lowConfidence = confidenceScore < CONFIDENCE_THRESHOLD;

  const criticalCount = flags.filter((f) => f.severity === "CRITICAL").length;
  const warningCount  = flags.filter((f) => f.severity === "WARNING").length;
  const infoCount     = flags.filter((f) => f.severity === "INFO").length;

  // =============================================================
  // MAIN RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50">

      {/* LEGAL DISCLAIMER BANNER */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">
            <span className="font-bold">{t.disclaimer}</span>{" "}
            This report is generated by AI and may contain errors. Do not make legal decisions
            based solely on this report. Consult a qualified legal professional.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* HEADER */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
          </div>
          <p className="text-xs text-slate-500 font-mono break-all">
            ID: {contractId}
          </p>
          {report.analyzed_at && (
            <p className="text-xs text-slate-400 mt-0.5">
              {t.analysedAt}: {new Date(report.analyzed_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* VERDICT + SCORE BLOCK */}
        <div className={`rounded-xl border ${vs.bg} ${vs.border} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {vs.icon}
              <span className={`text-sm font-bold uppercase tracking-wide ${vs.text}`}>
                {verdict === "CRITICAL" ? t.verdict_critical : verdict === "CAUTION" ? t.verdict_caution : t.verdict_safe}
              </span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${vs.badge}`}>
              {verdict === "CRITICAL" ? t.badge_high : verdict === "CAUTION" ? t.badge_review : t.badge_safe}
            </span>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className={`text-5xl font-black ${vs.text}`}>
              {report.risk_score}
            </span>
            <span className="text-slate-400 text-sm mb-2">/ 100</span>
          </div>

          {/* Risk bar */}
          <div className="w-full bg-white rounded-full h-2.5 border border-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                verdict === "CRITICAL" ? "bg-red-500" : verdict === "CAUTION" ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${report.risk_score}%` }}
            />
          </div>

          {/* Severity counts */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Critical", count: criticalCount, style: "bg-red-100 text-red-700 border-red-200" },
              { label: "Warning",  count: warningCount,  style: "bg-amber-100 text-amber-700 border-amber-200" },
              { label: "Info",     count: infoCount,     style: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border text-center py-2 px-1 ${s.style}`}>
                <div className="text-xl font-black">{s.count}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFIDENCE SCORE BLOCK */}
        <div className={`rounded-xl border p-4 ${lowConfidence ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t.aiConfidence}
              </p>
              <p className={`text-2xl font-black mt-0.5 ${lowConfidence ? "text-amber-700" : "text-slate-900"}`}>
                {Math.round(confidenceScore * 100)}%
              </p>
            </div>
            {lowConfidence && <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />}
          </div>

          {lowConfidence && (
            <p className="text-xs text-amber-700 leading-relaxed mb-3">{t.lowConfidence}</p>
          )}

          {lowConfidence && !reviewSubmitted && (
            <div>
              <button
                onClick={handleRequestReview}
                disabled={reviewLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                {reviewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                {t.requestReview}
              </button>
              
            </div>
          )}

           {reviewSubmitted && (
             <p className="text-emerald-600 text-xs mt-2 font-medium">{t.reviewSubmitted}</p>
          )} 
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={downloadLoading || !reportMeta}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            {downloadLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t.downloadPdf}
          </button>

          <button
            onClick={handleShare}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t.shareReport}
          </button>
        </div>

        {/* No report yet */}
        {!reportMeta && report.status === "completed" && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-slate-500 text-xs">
              PDF report is being generated. Refresh in a moment.
            </p>
          </div>
        )}

        {/* FLAG CARDS */}
        {flags.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              {t.riskFlags} ({flags.length})
            </h2>
            <div className="space-y-3">
              {flags.map((flag) => {
                const ss = severityStyles(flag.severity);
                return (
                  <button
                    key={flag.flag_id}
                    onClick={() => handleFlagClick(flag.flag_id)}
                    className={`w-full text-left rounded-xl border ${ss.bg} ${ss.border} p-4 transition-opacity hover:opacity-90 active:opacity-75`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ss.badge}`}>
                            {flag.severity}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{flag.category}</span>
                        </div>
                        <p className={`text-sm font-bold leading-snug ${ss.text}`}>{flag.title}</p>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {flag.plain_language_explanation}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 bg-white rounded-full h-1.5 border border-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ss.bar}`}
                              style={{ width: `${Math.round(flag.ai_confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {Math.round(flag.ai_confidence * 100)}% {t.confidence}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {flags.length === 0 && report.status === "completed" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-emerald-700 font-semibold text-sm">{t.noFlags}</p>
            <p className="text-emerald-600 text-xs mt-1">{t.noFlagsSub}</p>
          </div>
        )}

        {/* BOTTOM DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs leading-relaxed">
            <span className="font-semibold text-slate-600">{t.disclaimer}</span>{" "}
            {t.disclaimerBody}
          </p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}