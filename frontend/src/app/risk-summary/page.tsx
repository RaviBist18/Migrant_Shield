"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
  Trash2,
} from "lucide-react";
import { translations } from "@/lib/i18n/landing";
import type { Lang } from "@/lib/i18n/landing";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type RiskLevel = "all" | "high" | "medium" | "low";

type Contract = {
  contract_id: string;
  worker_name: string | null;
  employer_name: string | null;
  risk_score: number;
  upload_date: string | null;
  original_filename: string | null;
  critical_flags_count: number;
};

function getRiskLevel(score: number): "high" | "medium" | "low" {
  if (score >= 71) return "high";
  if (score >= 41) return "medium";
  return "low";
}

function getRiskMeta(
  score: number,
  labels: { high: string; medium: string; low: string },
) {
  const level = getRiskLevel(score);
  if (level === "high")
    return {
      label: labels.high,
      color: "text-red-700",
      badge: "bg-red-50 border border-red-200 text-red-700",
      icon: <ShieldAlert size={13} className="text-red-500" />,
    };
  if (level === "medium")
    return {
      label: labels.medium,
      color: "text-amber-700",
      badge: "bg-amber-50 border border-amber-200 text-amber-700",
      icon: <ShieldMinus size={13} className="text-amber-500" />,
    };
  return {
    label: labels.low,
    color: "text-emerald-700",
    badge: "bg-emerald-50 border border-emerald-200 text-emerald-700",
    icon: <ShieldCheck size={13} className="text-emerald-500" />,
  };
}

const PAGE_SIZE = 15;

function DeleteModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
              Delete this contract?
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskSummaryPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RiskLevel>("all");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const sync = () => setLang((localStorage.getItem("lang") as Lang) ?? "en");
    sync();
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);
  const t = translations[lang].riskSummaryPage;
  const riskLabels = { high: t.high, medium: t.medium, low: t.low };

  useEffect(() => {
    const fetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/phone");
        return;
      }
      const { data } = await supabase
        .from("contracts")
        .select(`*, critical_flags_count:contract_flags(count)`)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("contract_flags.severity", "critical")
        .order("upload_date", { ascending: false });

      if (data) {
        setContracts(
          data.map((c: any) => ({
            ...c,
            critical_flags_count: c.critical_flags_count?.[0]?.count ?? 0,
          })),
        );
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const highCount = contracts.filter(
    (c) => getRiskLevel(c.risk_score) === "high",
  ).length;
  const mediumCount = contracts.filter(
    (c) => getRiskLevel(c.risk_score) === "medium",
  ).length;
  const lowCount = contracts.filter(
    (c) => getRiskLevel(c.risk_score) === "low",
  ).length;

  const filtered =
    filter === "all"
      ? contracts
      : contracts.filter((c) => getRiskLevel(c.risk_score) === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const FILTERS: {
    key: RiskLevel;
    label: string;
    count: number;
    active: string;
    inactive: string;
  }[] = [
    {
      key: "all",
      label: t.all,
      count: contracts.length,
      active: "bg-slate-900 text-white",
      inactive:
        "bg-white border border-slate-200 text-slate-600 hover:border-slate-400",
    },
    {
      key: "high",
      label: t.high,
      count: highCount,
      active: "bg-red-600 text-white",
      inactive:
        "bg-white border border-red-200 text-red-600 hover:border-red-400",
    },
    {
      key: "medium",
      label: t.medium,
      count: mediumCount,
      active: "bg-amber-500 text-white",
      inactive:
        "bg-white border border-amber-200 text-amber-600 hover:border-amber-400",
    },
    {
      key: "low",
      label: t.low,
      count: lowCount,
      active: "bg-emerald-600 text-white",
      inactive:
        "bg-white border border-emerald-200 text-emerald-600 hover:border-emerald-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {deleteId && (
          <DeleteModal
            onConfirm={async () => {
              if (deleteId === "__bulk__") {
                setBulkDeleting(true);
                const ids = Array.from(selectedIds);
                await supabase
                  .from("contracts")
                  .delete()
                  .in("contract_id", ids);
                setContracts((prev) =>
                  prev.filter((x) => !selectedIds.has(x.contract_id)),
                );
                setSelectedIds(new Set());
                setBulkDeleting(false);
              } else {
                setDeleting(true);
                await supabase
                  .from("contracts")
                  .delete()
                  .eq("contract_id", deleteId);
                setContracts((prev) =>
                  prev.filter((x) => x.contract_id !== deleteId),
                );
                setDeleting(false);
              }
              setDeleteId(null);
            }}
            onCancel={() => setDeleteId(null)}
            loading={deleting || bulkDeleting}
          />
        )}

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium mb-4"
        >
          <ChevronLeft size={16} /> {t.back}
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Summary bar */}
        {!loading && contracts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              {
                label: t.high,
                count: highCount,
                icon: <ShieldAlert size={16} className="text-red-500" />,
                bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
                text: "text-red-700 dark:text-red-400",
              },
              {
                label: t.medium,
                count: mediumCount,
                icon: <ShieldMinus size={16} className="text-amber-500" />,
                bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
                text: "text-amber-700 dark:text-amber-400",
              },
              {
                label: t.low,
                count: lowCount,
                icon: <ShieldCheck size={16} className="text-emerald-500" />,
                bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
                text: "text-emerald-700 dark:text-emerald-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${s.bg}`}
              >
                {s.icon}
                <div>
                  <p className={`text-xl font-bold ${s.text}`}>{s.count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key ? f.active : f.inactive
                }`}
              >
                {f.label}
                {f.count > 0 ? ` (${f.count})` : ""}
              </button>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setDeleteId("__bulk__")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <Trash2 size={12} />
              {t.deleteSelected} ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 animate-pulse"
                >
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded hidden sm:block" />
                  <div className="w-16 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ShieldCheck size={28} className="text-slate-300" />
              <p className="text-slate-500 text-sm">{t.noContracts}</p>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {t.clearFilter}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                      <th className="px-5 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === paginated.length &&
                            paginated.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedIds(
                                new Set(paginated.map((c) => c.contract_id)),
                              );
                            else setSelectedIds(new Set());
                          }}
                          className="rounded border-slate-300 text-slate-900 cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.worker}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.employer}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.riskScore}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.level}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.date}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                        {t.flags}
                      </th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c, i) => {
                      const meta = getRiskMeta(c.risk_score, riskLabels);
                      const isLast = i === paginated.length - 1;
                      return (
                        <tr
                          key={c.contract_id}
                          onClick={() =>
                            router.push(`/report/${c.contract_id}?view=compact`)
                          }
                          className={`group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            !isLast
                              ? "border-b border-slate-100 dark:border-slate-800"
                              : ""
                          }`}
                        >
                          <td
                            className="px-5 py-4 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.contract_id)}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  e.target.checked
                                    ? next.add(c.contract_id)
                                    : next.delete(c.contract_id);
                                  return next;
                                });
                              }}
                              className="rounded border-slate-300 text-slate-900 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                              {c.worker_name || c.original_filename || "—"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {c.contract_id?.slice(0, 8)}…
                            </p>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {c.employer_name || "—"}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`text-lg font-bold ${meta.color}`}>
                              {c.risk_score}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}
                            >
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-500 tabular-nums">
                            {c.upload_date?.slice(0, 10) ?? "—"}
                          </td>
                          <td className="px-3 py-4">
                            {(c.critical_flags_count ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase">
                                <AlertTriangle size={10} />
                                {c.critical_flags_count} {t.critical}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase">
                                <CheckCircle size={10} />
                                {t.safe}
                              </span>
                            )}
                          </td>
                          <td
                            className="px-3 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(c.contract_id);
                              }}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((c) => {
                  const meta = getRiskMeta(c.risk_score, riskLabels);
                  return (
                    <div
                      key={c.contract_id}
                      onClick={() =>
                        router.push(`/report/${c.contract_id}?view=compact`)
                      }
                      className="p-4 space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {c.worker_name || c.original_filename || "—"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.employer_name || "—"} ·{" "}
                            {c.upload_date?.slice(0, 10)}
                          </p>
                        </div>
                        <span
                          className={`text-xl font-bold shrink-0 ${meta.color}`}
                        >
                          {c.risk_score}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}
                        >
                          {meta.icon} {meta.label}
                        </span>
                        {(c.critical_flags_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase">
                            <AlertTriangle size={10} />
                            {c.critical_flags_count} {t.critical}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} {t.of}{" "}
                    {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pageNum =
                        totalPages <= 7
                          ? i + 1
                          : page <= 4
                            ? i + 1
                            : page >= totalPages - 3
                              ? totalPages - 6 + i
                              : page - 3 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            page === pageNum
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                              : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
