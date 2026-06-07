"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  BookOpen,
  Scale,
  ShieldCheck,
  Save,
  Loader2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

interface Flag {
  flag_id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  clause_text?: string;
  recommendation?: string;
  mitigation_steps?: string[];
  legal_references?: string[];
}

interface ReviewDetail {
  review: {
    review_id: string;
    contract_id: string;
    reason: string;
    status: "pending" | "reviewed" | "rejected";
    created_at: string;
    admin_note?: string;
    reviewed_at?: string;
  };
  contract: {
    contract_id: string;
    status: string;
    risk_score: number;
    language: string;
    upload_date: string;
    analyzed_at: string;
  } | null;
  flags: Flag[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function severityColor(s: string) {
  if (s === "critical")
    return {
      bar: "bg-red-500",
      text: "text-red-400",
      badge: "border-red-800/60 text-red-400 bg-red-900/20",
    };
  if (s === "warning")
    return {
      bar: "bg-amber-500",
      text: "text-amber-400",
      badge: "border-amber-800/60 text-amber-400 bg-amber-900/20",
    };
  return {
    bar: "bg-slate-500",
    text: "text-slate-400",
    badge: "border-slate-700 text-slate-400 bg-slate-800/40",
  };
}

function riskColor(score: number) {
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-amber-400";
  return "text-emerald-400";
}

export default function ReviewDetailPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reviewId = params?.review_id as string;

  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user || user.id !== ADMIN_USER_ID) router.replace("/dashboard");
  }, [user, loading]);

  const fetchDetail = useCallback(async () => {
    if (!session?.access_token || !reviewId) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/review/${reviewId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ReviewDetail = await res.json();
      setDetail(data);
      setNote(data.review.admin_note ?? "");
    } catch (e: any) {
      setError(e.message || "Failed to load review.");
    } finally {
      setFetching(false);
    }
  }, [session?.access_token, reviewId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const updateStatus = async (status: "reviewed" | "rejected" | "pending") => {
    if (!session?.access_token) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`${API_BASE}/admin/review/${reviewId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, admin_note: note }),
      });
      if (!res.ok) throw new Error("Update failed.");
      setSaveStatus("saved");
      await fetchDetail();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || user.id !== ADMIN_USER_ID) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Queue
            </button>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-400 font-mono truncate max-w-[180px]">
                {reviewId}
              </span>
            </div>
          </div>
          {detail && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                detail.review.status === "pending"
                  ? "border-amber-800/60 text-amber-400 bg-amber-900/20"
                  : detail.review.status === "reviewed"
                    ? "border-emerald-800/60 text-emerald-400 bg-emerald-900/20"
                    : "border-red-800/60 text-red-400 bg-red-900/20"
              }`}
            >
              {detail.review.status}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {fetching ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse"
              >
                <div className="h-4 bg-slate-800 rounded w-1/4 mb-4" />
                <div className="h-3 bg-slate-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800/60 rounded-xl p-6 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : detail ? (
          <>
            {/* Request info */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                Review Request
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {detail.review.reason}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted {timeAgo(detail.review.created_at)}
                </span>
                {detail.review.reviewed_at && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Reviewed {timeAgo(detail.review.reviewed_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Contract meta */}
            {detail.contract && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-500 mb-4">
                  Contract
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Risk Score</p>
                    <p
                      className={`text-2xl font-black ${riskColor(detail.contract.risk_score)}`}
                    >
                      {detail.contract.risk_score}
                      <span className="text-sm font-normal text-slate-600">
                        /100
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Flags</p>
                    <p className="text-2xl font-black text-slate-300">
                      {detail.flags.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Language</p>
                    <p className="text-sm font-semibold text-slate-300 uppercase">
                      {detail.contract.language}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Uploaded</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {detail.contract.upload_date?.slice(0, 10) ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-600 font-mono break-all">
                    {detail.contract.contract_id}
                  </p>
                </div>
              </div>
            )}

            {/* Flags */}
            {detail.flags.length > 0 && (
              <div>
                <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-500 mb-3">
                  Flags ({detail.flags.length})
                </h2>
                <div className="space-y-2.5">
                  {detail.flags.map((flag) => {
                    const sc = severityColor(flag.severity);
                    const isExp = expandedFlag === flag.flag_id;
                    const steps = Array.isArray(flag.mitigation_steps)
                      ? flag.mitigation_steps
                      : flag.recommendation
                        ? [flag.recommendation]
                        : [];
                    const refs = Array.isArray(flag.legal_references)
                      ? flag.legal_references
                      : [];

                    return (
                      <div
                        key={flag.flag_id}
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                      >
                        <div className={`h-0.5 w-full ${sc.bar}`} />
                        <button
                          onClick={() =>
                            setExpandedFlag(isExp ? null : flag.flag_id)
                          }
                          className="w-full text-left px-5 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}
                                >
                                  {flag.severity}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-200">
                                {flag.title}
                              </p>
                              {!isExp && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                  {flag.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-slate-600 text-xs mt-1 transition-transform ${isExp ? "rotate-90" : ""}`}
                            >
                              ▶
                            </span>
                          </div>
                        </button>

                        {isExp && (
                          <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
                            {flag.clause_text && (
                              <div className="pt-4">
                                <p className="text-xs uppercase font-semibold tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" /> Extracted
                                  Clause
                                </p>
                                <div
                                  className={`border-l-2 ${sc.bar.replace("bg-", "border-")} bg-slate-950/60 p-4 rounded-r-lg font-mono text-xs text-slate-400 leading-relaxed`}
                                >
                                  {flag.clause_text}
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-xs uppercase font-semibold tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" /> Explanation
                              </p>
                              <p className="text-sm text-slate-400 leading-relaxed pl-3 border-l border-slate-800">
                                {flag.description}
                              </p>
                            </div>
                            {steps.length > 0 && (
                              <div>
                                <p className="text-xs uppercase font-semibold tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5" />{" "}
                                  Recommendations
                                </p>
                                <div className="space-y-2">
                                  {steps.map((s, i) => (
                                    <div key={i} className="flex gap-2.5">
                                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        {i + 1}
                                      </span>
                                      <p className="text-sm text-slate-400">
                                        {s}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {refs.length > 0 && (
                              <div>
                                <p className="text-xs uppercase font-semibold tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                                  <Scale className="w-3.5 h-3.5" /> Legal
                                  References
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {refs.map((r, i) => (
                                    <span
                                      key={i}
                                      className="text-xs border border-slate-700 text-slate-500 px-2.5 py-1 rounded-lg"
                                    >
                                      {r}
                                    </span>
                                  ))}
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
            )}

            {/* Admin note + actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                Admin Note
              </h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add your review notes, findings, or recommendations for this contract..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-lg px-4 py-3 text-sm text-slate-300 placeholder-slate-700 outline-none transition-colors resize-none font-mono leading-relaxed"
              />

              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" /> Saved successfully.
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4" /> Save failed. Try again.
                </div>
              )}

              <div className="flex gap-2.5 flex-wrap">
                <button
                  onClick={() => updateStatus("reviewed")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark Reviewed
                </button>
                <button
                  onClick={() => updateStatus("rejected")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => updateStatus("pending")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Clock className="w-4 h-4" /> Reset to Pending
                </button>
                <button
                  onClick={async () => {
                    if (!session?.access_token) return;
                    setSaving(true);
                    setSaveStatus("idle");
                    try {
                      const res = await fetch(
                        `${API_BASE}/admin/review/${reviewId}`,
                        {
                          method: "PATCH",
                          headers: {
                            Authorization: `Bearer ${session.access_token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status: detail.review.status,
                            admin_note: note,
                          }),
                        },
                      );
                      if (!res.ok) throw new Error();
                      setSaveStatus("saved");
                      setTimeout(() => setSaveStatus("idle"), 3000);
                    } catch {
                      setSaveStatus("error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ml-auto"
                >
                  <Save className="w-4 h-4" /> Save Note
                </button>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
