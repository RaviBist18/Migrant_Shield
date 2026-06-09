"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  LogOut,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Home,
  History,
  LayoutDashboard,
  XCircle,
  Trash2,
  RefreshCw,
  Search,
  X,
  WifiOff,
  Copy,
} from "lucide-react";
import { translations } from "@/lib/i18n/landing";
import type { Contract, Status } from "@/types";
import type { Lang } from "@/lib/i18n/landing";

// ─── Supabase client ───────────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

type SortField = "upload_date" | "employer_name" | "risk_score";
type SortDir = "asc" | "desc";
type FilterType = "all" | "completed" | "critical" | "processing" | "failed";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getRiskMeta(
  score: number,
  t: (typeof translations)["en"]["dashboard"],
) {
  if (score >= 71)
    return {
      label: t.riskHigh,
      classes: "text-red-700 font-bold",
      badgeClasses:
        "bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
    };
  if (score >= 41)
    return {
      label: t.riskMedium,
      classes: "text-amber-700 font-bold",
      badgeClasses:
        "bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
    };
  return {
    label: t.riskLow,
    classes: "text-emerald-700 font-bold",
    badgeClasses:
      "bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
  };
}

function getStatusMeta(
  status: Status,
  t: (typeof translations)["en"]["dashboard"],
) {
  switch (status) {
    case "completed":
      return {
        label: t.statusCompleted,
        classes: "text-emerald-700",
        icon: <CheckCircle size={13} />,
      };
    case "processing":
      return {
        label: t.statusProcessing,
        classes: "text-amber-600",
        icon: <Clock size={13} />,
      };
    case "queued":
      return {
        label: t.statusQueued,
        classes: "text-slate-500",
        icon: <Clock size={13} />,
      };
    case "failed":
      return {
        label: t.statusFailed,
        classes: "text-red-600",
        icon: <XCircle size={13} />,
      };
  }
}

function isStuck(contract: Contract): boolean {
  if (contract.status !== "processing" && contract.status !== "queued")
    return false;
  const uploadTime = contract.upload_date
    ? new Date(contract.upload_date).getTime()
    : null;
  if (!uploadTime) return false;
  return Date.now() - uploadTime > STUCK_THRESHOLD_MS;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-200 dark:bg-slate-800 rounded-xl h-24"
          />
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 mx-4 my-3 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  t,
  onUpload,
}: {
  t: (typeof translations)["en"]["dashboard"];
  onUpload: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
        <FileText size={28} className="text-slate-400" />
      </div>
      <div>
        <h2 className="text-slate-800 font-semibold text-lg mb-1">
          {t.emptyHeading}
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
          {t.emptyDesc}
        </p>
      </div>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-colors"
      >
        <Upload size={15} /> {t.emptyCta}
      </button>
    </div>
  );
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
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
            <h3 className="text-slate-900 font-semibold text-sm">
              Delete {count} contract{count !== 1 ? "s" : ""}?
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

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("upload_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stuckDismissed, setStuckDismissed] = useState(false);

  // Quota warning dismissed
  const [quotaWarningDismissed, setQuotaWarningDismissed] = useState(false);

  // ── Lang detect ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("lang");
    return stored === "en" || stored === "ne" ? stored : "en";
  });

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("lang");
      setLang(stored === "ne" ? "ne" : "en");
    };
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  const t = translations[lang].dashboard;

  // ── Auth + fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      setUserEmail(user.email ?? null);
      setUserId(user.id);

      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          critical_flags_count:contract_flags(count)
        `,
        )
        .eq("user_id", user.id)
        .eq("contract_flags.severity", "critical")
        .order("upload_date", { ascending: false });

      if (!error && data) {
        const mapped = data.map((c: any) => ({
          ...c,
          critical_flags_count: c.critical_flags_count?.[0]?.count ?? 0,
        }));
        setContracts(mapped as Contract[]);
      }
      setIsLoading(false);
    };
    init();
  }, [router]);

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("dashboard-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contracts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setContracts((prev) => [payload.new as Contract, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setContracts((prev) =>
              prev.map((c) =>
                c.contract_id === (payload.new as Contract).contract_id
                  ? { ...c, ...(payload.new as Contract) }
                  : c,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setContracts((prev) =>
              prev.filter(
                (c) => c.contract_id !== (payload.old as Contract).contract_id,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  // ── Retry ────────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(async (contractId: string) => {
    setRetryingIds((prev) => new Set(prev).add(contractId));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contracts/${contractId}/reanalyze`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
    } catch (e) {
      console.warn("[retry] failed:", e);
    } finally {
      setRetryingIds((prev) => {
        const s = new Set(prev);
        s.delete(contractId);
        return s;
      });
    }
  }, []);

  // ── Bulk delete ───────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("contracts")
        .delete()
        .in("contract_id", ids);
      if (!error) {
        setContracts((prev) =>
          prev.filter((c) => !selectedIds.has(c.contract_id)),
        );
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.warn("[bulk-delete] failed:", e);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const toggleSelect = (contractId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // ── Stat derivations ─────────────────────────────────────────────────────────
  const totalContracts = contracts.length;
  const analysed = contracts.filter((c) => c.status === "completed").length;
  const criticalFlags = contracts.reduce(
    (sum, c) => sum + (c.critical_flags_count ?? 0),
    0,
  );
  const processingCount = contracts.filter(
    (c) => c.status === "processing" || c.status === "queued",
  ).length;
  const failedCount = contracts.filter((c) => c.status === "failed").length;

  // Stuck contracts check
  const stuckContracts = contracts.filter(isStuck);

  // Quota warning: any contract failed with 429 in error_message
  const hasQuotaError = contracts.some(
    (c) => c.status === "failed" && (c as any).error_message?.includes("429"),
  );

  // Weekly trend (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekContracts = contracts.filter(
    (c) => c.upload_date && new Date(c.upload_date).getTime() > oneWeekAgo,
  ).length;
  const thisWeekCompleted = contracts.filter(
    (c) =>
      c.status === "completed" &&
      c.upload_date &&
      new Date(c.upload_date).getTime() > oneWeekAgo,
  ).length;
  const thisWeekFailed = contracts.filter(
    (c) =>
      c.status === "failed" &&
      c.upload_date &&
      new Date(c.upload_date).getTime() > oneWeekAgo,
  ).length;

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = contracts.filter((c) => {
    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "completed"
          ? c.status === "completed"
          : activeFilter === "processing"
            ? c.status === "processing" || c.status === "queued"
            : activeFilter === "critical"
              ? (c.critical_flags_count ?? 0) > 0
              : activeFilter === "failed"
                ? c.status === "failed"
                : true;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.worker_name ?? "").toLowerCase().includes(q) ||
      (c.employer_name ?? "").toLowerCase().includes(q) ||
      (c.country ?? "").toLowerCase().includes(q) ||
      (c.original_filename ?? "").toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = a[sortField] ?? "";
    let bv: string | number = b[sortField] ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedIds = paginated.map((c) => c.contract_id);
  const allPageSelected =
    paginatedIds.length > 0 && paginatedIds.every((id) => selectedIds.has(id));

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleFilterCard = (f: FilterType) => {
    setActiveFilter((prev) => (prev === f ? "all" : f));
    setPage(1);
    setSelectedIds(new Set());
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-slate-600" />
    ) : (
      <ChevronDown size={12} className="text-slate-600" />
    );
  };

  // ── Stat cards config ────────────────────────────────────────────────────────
  const statCards = [
    {
      key: "all" as FilterType,
      icon: <FileText size={18} />,
      label: t.totalContracts,
      value: totalContracts,
      trend: thisWeekContracts > 0 ? `+${thisWeekContracts} this week` : null,
      trendUp: true,
    },
    {
      key: "completed" as FilterType,
      icon: <CheckCircle size={18} />,
      label: t.analysed,
      value: analysed,
      trend: thisWeekCompleted > 0 ? `+${thisWeekCompleted} this week` : null,
      trendUp: true,
    },
    {
      key: "critical" as FilterType,
      icon: <AlertTriangle size={18} />,
      label: t.criticalFlags,
      value: criticalFlags,
      trend: criticalFlags > 0 ? "Needs attention" : null,
      trendUp: false,
    },
    {
      key: "processing" as FilterType,
      icon: <Clock size={18} />,
      label: t.processing,
      value: processingCount,
      trend:
        stuckContracts.length > 0
          ? `${stuckContracts.length} stuck >10min`
          : null,
      trendUp: false,
    },
    {
      key: "failed" as FilterType,
      icon: <XCircle size={18} />,
      label: t.statusFailed,
      value: failedCount,
      trend: thisWeekFailed > 0 ? `${thisWeekFailed} this week` : null,
      trendUp: false,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <DeleteModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-24 md:pb-10">
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            {/* ── Quota warning banner ── */}
            {hasQuotaError && !quotaWarningDismissed && (
              <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <WifiOff size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    AI quota exhausted
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                    Some contracts failed due to rate limits. Retry after quota
                    resets or upgrade Groq plan.
                  </p>
                </div>
                <button
                  onClick={() => setQuotaWarningDismissed(true)}
                  className="text-amber-500 hover:text-amber-700 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── Stuck processing warning ── */}
            {stuckContracts.length > 0 && !stuckDismissed && (
              <div className="mb-4 flex items-start gap-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                <Clock size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    {stuckContracts.length} contract
                    {stuckContracts.length > 1 ? "s" : ""} stuck in processing
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Analysis hasn't completed in over 10 minutes. Try retrying.
                  </p>
                </div>
                <button
                  onClick={() =>
                    stuckContracts.forEach((c) => handleRetry(c.contract_id))
                  }
                  className="text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Retry all
                </button>
                <button
                  onClick={() => setStuckDismissed(true)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {statCards.map((card) => {
                const isActive = activeFilter === card.key;
                const isFailed = card.key === "failed";
                return (
                  <button
                    key={card.key}
                    onClick={() => handleFilterCard(card.key)}
                    className={`bg-white dark:bg-slate-900 border rounded-xl shadow-sm p-4 flex flex-col gap-2 text-left transition-all hover:shadow-md ${
                      isActive
                        ? card.key === "failed"
                          ? "border-red-400 dark:border-red-600 ring-1 ring-red-400 dark:ring-red-600"
                          : card.key === "completed"
                            ? "border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400 dark:ring-emerald-600"
                            : card.key === "critical"
                              ? "border-orange-400 dark:border-orange-600 ring-1 ring-orange-400 dark:ring-orange-600"
                              : card.key === "processing"
                                ? "border-amber-400 dark:border-amber-600 ring-1 ring-amber-400 dark:ring-amber-600"
                                : "border-slate-900 dark:border-slate-100 ring-1 ring-slate-900 dark:ring-slate-100"
                        : isFailed && failedCount > 0
                          ? "border-red-200 dark:border-red-900"
                          : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg w-fit border ${
                        isFailed && failedCount > 0
                          ? "bg-red-50 border-red-100 text-red-500"
                          : "bg-slate-50 border-slate-100 text-slate-400"
                      }`}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <p
                        className={`text-2xl font-bold ${
                          isFailed && failedCount > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {card.value}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-tight">
                        {card.label}
                      </p>
                      {card.trend && (
                        <p
                          className={`text-[10px] mt-1 font-medium ${
                            card.trendUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isFailed || card.key === "critical"
                                ? "text-red-500 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {card.trendUp ? "↑" : "↗"} {card.trend}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Empty or table ── */}
            {contracts.length === 0 ? (
              <EmptyState t={t} onUpload={() => router.push("/upload")} />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-base">
                      {t.contractRecords}
                    </h2>
                    {activeFilter !== "all" && (
                      <button
                        onClick={() => {
                          setActiveFilter("all");
                          setSelectedIds(new Set());
                        }}
                        className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        {activeFilter} <X size={10} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder={
                          translations[lang].history.searchPlaceholder
                        }
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(1);
                        }}
                        className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 w-44 sm:w-56 placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => router.push("/history")}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      {t.viewAll} <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                  {(
                    [
                      "all",
                      "completed",
                      "processing",
                      "failed",
                      "critical",
                    ] as FilterType[]
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFilterCard(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        activeFilter === f
                          ? f === "failed"
                            ? "bg-red-600 text-white"
                            : f === "completed"
                              ? "bg-emerald-600 text-white"
                              : f === "processing"
                                ? "bg-amber-500 text-white"
                                : f === "critical"
                                  ? "bg-orange-500 text-white"
                                  : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {f === "all"
                        ? translations[lang].history.filterAll
                        : f === "completed"
                          ? t.statusCompleted
                          : f === "processing"
                            ? t.statusProcessing
                            : f === "failed"
                              ? `${t.statusFailed}${failedCount > 0 ? ` (${failedCount})` : ""}`
                              : t.criticalFlags}
                    </button>
                  ))}
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={12} /> Delete selected
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-slate-500 hover:text-slate-700 ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* ── Desktop table ── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-5 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={() => toggleSelectAll(paginatedIds)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </th>
                        <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                          {t.colWorker}
                        </th>
                        <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                          {t.colEmployer}
                        </th>
                        <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                          {t.colCountry}
                        </th>
                        <th className="px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold text-left">
                          <button
                            onClick={() => handleSort("upload_date")}
                            className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                          >
                            {t.colDate} <SortIcon field="upload_date" />
                          </button>
                        </th>
                        <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                          {t.colStatus}
                        </th>
                        <th className="px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold text-left">
                          <button
                            onClick={() => handleSort("risk_score")}
                            className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                          >
                            {t.colRisk} <SortIcon field="risk_score" />
                          </button>
                        </th>
                        <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                          {t.colFlags}
                        </th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((contract, i) => {
                        const statusMeta = getStatusMeta(
                          contract.status,
                          t,
                        ) ?? {
                          label: contract.status,
                          classes: "text-slate-400",
                          icon: null,
                        };
                        const riskMeta =
                          contract.risk_score > 0
                            ? getRiskMeta(contract.risk_score, t)
                            : null;
                        const isLast = i === paginated.length - 1;
                        const stuck = isStuck(contract);
                        const isSelected = selectedIds.has(
                          contract.contract_id,
                        );

                        return (
                          <tr
                            key={contract.contract_id}
                            className={`transition-colors ${!isLast ? "border-b border-slate-100 dark:border-slate-800" : ""} ${
                              isSelected
                                ? "bg-slate-50 dark:bg-slate-800/40"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <td className="px-5 py-4 w-10">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleSelect(contract.contract_id)
                                }
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                              />
                            </td>
                            <td className="px-3 py-4">
                              <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                                {contract.worker_name ||
                                  contract.original_filename ||
                                  t.notSpecified}
                              </p>
                              <p className="text-slate-400 text-xs font-mono">
                                {contract.contract_id?.slice(0, 8) ?? "—"}…
                              </p>
                            </td>
                            <td className="px-3 py-4 text-slate-600 dark:text-slate-400 text-sm truncate max-w-[140px]">
                              {contract.employer_name || t.notSpecified}
                            </td>
                            <td className="px-3 py-4 text-slate-600 dark:text-slate-400 text-sm">
                              {contract.country || t.notSpecified}
                            </td>
                            <td className="px-3 py-4 text-slate-500 text-sm tabular-nums">
                              {contract.upload_date?.slice(0, 10) ?? "—"}
                            </td>
                            <td className="px-3 py-4">
                              <div
                                className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.classes}`}
                              >
                                {statusMeta.icon} {statusMeta.label}
                                {stuck && (
                                  <span className="ml-1 text-[10px] text-amber-500 font-medium">
                                    (stuck)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              {contract.risk_score > 0 && riskMeta ? (
                                <span className={riskMeta.classes}>
                                  {contract.risk_score}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-4">
                              {(contract.critical_flags_count ?? 0) > 0 ? (
                                <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                                  {contract.critical_flags_count} critical
                                </span>
                              ) : contract.status === "completed" ? (
                                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                                  safe
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-right">
                              {contract.status === "completed" && (
                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/report/${contract.contract_id}?view=compact&chat=open`,
                                      )
                                    }
                                    className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-300 text-white dark:text-slate-900 flex items-center justify-center transition-colors"
                                    title="Ask Legal Assistant"
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 48 48"
                                      fill="none"
                                    >
                                      <path
                                        d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M17 18H27M17 23H31M17 28H24"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/report/${contract.contract_id}?view=compact`,
                                      )
                                    }
                                    className="text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium flex items-center gap-1 transition-colors"
                                  >
                                    {t.actionView} <ArrowRight size={11} />
                                  </button>
                                </div>
                              )}
                              {contract.status === "failed" && (
                                <button
                                  onClick={() =>
                                    handleRetry(contract.contract_id)
                                  }
                                  disabled={retryingIds.has(
                                    contract.contract_id,
                                  )}
                                  className="text-amber-600 hover:text-amber-800 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1 ml-auto"
                                >
                                  <RefreshCw size={11} />
                                  {retryingIds.has(contract.contract_id)
                                    ? "…"
                                    : t.actionRetry}
                                </button>
                              )}
                              {(contract.status === "processing" ||
                                contract.status === "queued") && (
                                <span className="text-slate-400 text-xs">
                                  {stuck ? (
                                    <button
                                      onClick={() =>
                                        handleRetry(contract.contract_id)
                                      }
                                      className="text-amber-600 hover:text-amber-800 text-xs flex items-center gap-1"
                                    >
                                      <RefreshCw size={11} /> Retry
                                    </button>
                                  ) : (
                                    statusMeta.label
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile cards ── */}
                <div className="sm:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((contract) => {
                    const statusMeta = getStatusMeta(contract.status, t) ?? {
                      label: contract.status,
                      classes: "text-slate-400",
                      icon: null,
                    };
                    const riskMeta =
                      contract.risk_score > 0
                        ? getRiskMeta(contract.risk_score, t)
                        : null;
                    const stuck = isStuck(contract);
                    const isSelected = selectedIds.has(contract.contract_id);

                    return (
                      <div
                        key={contract.contract_id}
                        className={`p-4 space-y-3 ${isSelected ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleSelect(contract.contract_id)
                              }
                              className="mt-1 rounded border-slate-300"
                            />
                            <div>
                              <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                                {contract.worker_name ||
                                  contract.original_filename ||
                                  t.notSpecified}
                              </p>
                              <p className="text-slate-500 text-xs mt-0.5">
                                {contract.employer_name || t.notSpecified}
                              </p>
                            </div>
                          </div>
                          {contract.risk_score > 0 && riskMeta && (
                            <span
                              className={`text-xl font-bold shrink-0 ${riskMeta.classes}`}
                            >
                              {contract.risk_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.classes}`}
                          >
                            {statusMeta.icon} {statusMeta.label}
                            {stuck && (
                              <span className="text-amber-500 text-[10px]">
                                (stuck)
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-xs">
                            {contract.upload_date?.slice(0, 10)}
                          </span>
                        </div>
                        {(contract.critical_flags_count ?? 0) > 0 && (
                          <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase inline-block">
                            {contract.critical_flags_count} critical
                          </span>
                        )}
                        <div className="flex gap-2">
                          {contract.status === "completed" && (
                            <>
                              <button
                                onClick={() =>
                                  router.push(
                                    `/report/${contract.contract_id}?view=compact&chat=open`,
                                  )
                                }
                                className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 48 48"
                                  fill="none"
                                >
                                  <path
                                    d="M24 4L6 11V24C6 33.94 13.94 43.28 24 46C34.06 43.28 42 33.94 42 24V11L24 4Z"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M17 18H27M17 23H31M17 28H24"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                Ask
                              </button>
                              <button
                                onClick={() =>
                                  router.push(
                                    `/report/${contract.contract_id}?view=compact`,
                                  )
                                }
                                className="flex items-center gap-1 text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {t.actionView} <ArrowRight size={11} />
                              </button>
                            </>
                          )}
                          {(contract.status === "failed" || stuck) && (
                            <button
                              onClick={() => handleRetry(contract.contract_id)}
                              disabled={retryingIds.has(contract.contract_id)}
                              className="flex items-center gap-1 text-amber-600 border border-amber-200 hover:bg-amber-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <RefreshCw size={11} />
                              {retryingIds.has(contract.contract_id)
                                ? "…"
                                : t.actionRetry}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                {sorted.length > PAGE_SIZE && (
                  <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {t.showing} {(page - 1) * PAGE_SIZE + 1}–
                      {Math.min(page * PAGE_SIZE, sorted.length)} {t.of}{" "}
                      {sorted.length} {t.records}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        ←
                      </button>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer nav (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 md:hidden">
        {[
          { href: "/", icon: <Home size={20} />, label: "Home" },
          {
            href: "/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
          },
          { href: "/upload", icon: <Upload size={20} />, label: "Upload" },
          { href: "/history", icon: <History size={20} />, label: "History" },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
