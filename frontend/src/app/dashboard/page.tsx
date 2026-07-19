"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  MessageSquare,
  BarChart2,
  ShieldAlert,
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
  const clickTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
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
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      contract_id: string;
      worker_name: string | null;
      original_filename: string | null;
      status: Status;
      risk_score: number;
      critical_flags_count: number;
      upload_date: string | null;
    }>
  >([]);

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
      setUserName(
        user.user_metadata?.full_name?.split(" ")[0] ??
          user.user_metadata?.name?.split(" ")[0] ??
          user.email?.split("@")[0] ??
          null,
      );
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

        // Recent activity: last 5 events
        const { data: activityData } = await supabase
          .from("contracts")
          .select(
            `
            contract_id, worker_name, original_filename,
            status, risk_score, upload_date,
            critical_flags_count:contract_flags(count)
          `,
          )
          .eq("user_id", user.id)
          .eq("contract_flags.severity", "critical")
          .order("upload_date", { ascending: false })
          .limit(5);

        if (activityData) {
          setRecentActivity(
            activityData.map((c: any) => ({
              ...c,
              critical_flags_count: c.critical_flags_count?.[0]?.count ?? 0,
            })),
          );
        }
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
  const highCount = contracts.filter((c) => (c.risk_score ?? 0) >= 71).length;

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
      icon: <FileText size={20} />,
      label: t.totalContracts,
      value: totalContracts,
      trend: thisWeekContracts > 0 ? `+${thisWeekContracts} this week` : null,
      trendUp: true,
    },
    {
      key: "completed" as FilterType,
      icon: <CheckCircle size={20} />,
      label: t.analysed,
      value: analysed,
      trend: thisWeekCompleted > 0 ? `+${thisWeekCompleted} this week` : null,
      trendUp: true,
    },
    {
      key: "critical" as FilterType,
      icon: <AlertTriangle size={20} />,
      label: t.criticalFlags,
      value: criticalFlags,
      trend: criticalFlags > 0 ? "Needs attention" : null,
      trendUp: false,
    },
    {
      key: "processing" as FilterType,
      icon: <Clock size={20} />,
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
      icon: <XCircle size={20} />,
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 pb-24 md:pb-6">
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            {/* ── Greeting ── */}
            <div className="mb-4 mt-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight mt-[-20px]">
                {totalContracts === 0
                  ? `${t.welcomeMsg}${userName ? `, ${userName}` : ""}.`
                  : `${t.onDuty}${userName ? `, ${userName}` : ""}.`}
              </h1>
              <p className="mt-1.5 text-base text-slate-500 dark:text-slate-400">
                {totalContracts === 0
                  ? t.missionStart
                  : criticalFlags > 0
                    ? `${criticalFlags} ${t.needAttention}`
                    : failedCount > 0
                      ? `${failedCount} contract${failedCount !== 1 ? "s" : ""} failed processing. Review now.`
                      : `${t.allClear} ${analysed} ${t.contractsAnalysed}`}
              </p>
            </div>

            {/* ── Alert banners ── */}
            {hasQuotaError && !quotaWarningDismissed && (
              <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <WifiOff size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 dark:text-amber-300 text-sm font-semibold">
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

            {failedCount > 0 &&
              !stuckDismissed &&
              stuckContracts.length === 0 && (
                <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-red-800 dark:text-red-300 text-sm font-semibold">
                      {failedCount} contract{failedCount !== 1 ? "s" : ""}{" "}
                      failed
                    </p>
                    <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">
                      Review and retry failed contracts below.
                    </p>
                  </div>
                  <button
                    onClick={() => handleFilterCard("failed")}
                    className="text-xs text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                  >
                    View failed
                  </button>
                </div>
              )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 mb-5 mt-8">
              {statCards.map((card) => {
                const isActive = activeFilter === card.key;
                const isFailed = card.key === "failed";
                return (
                  <button
                    key={card.key}
                    onClick={() => {
                      if (clickTimer.current[card.key]) {
                        clearTimeout(clickTimer.current[card.key]);
                        delete clickTimer.current[card.key];
                        router.push(`/history?filter=${card.key}`);
                      } else {
                        clickTimer.current[card.key] = setTimeout(() => {
                          delete clickTimer.current[card.key];
                          handleFilterCard(card.key);
                        }, 250);
                      }
                    }}
                    className={`bg-white dark:bg-slate-900 border rounded-xl shadow-sm px-4 py-3 flex flex-row items-center gap-3 text-left transition-all hover:shadow-md ${
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
                      className={`p-1.5 rounded-lg w-fit border ${
                        card.key === "failed" && failedCount > 0
                          ? "bg-red-50 border-red-100 text-red-500"
                          : card.key === "critical"
                            ? "bg-orange-50 border-orange-100 text-orange-500"
                            : card.key === "processing"
                              ? "bg-amber-50 border-amber-100 text-amber-500"
                              : card.key === "completed"
                                ? "bg-emerald-50 border-emerald-100 text-emerald-500"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                      }`}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <p
                        className={`text-xl font-bold ${
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

            {/* ── What's Next ── */}
            {totalContracts > 0 && (
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 mt-3">
                  {t.whatsNext}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 mb-4">
                  {[
                    {
                      label: t.uploadNewContract,
                      sub: t.uploadNewContractSub,
                      icon: <Upload size={22} />,
                      iconBg: "bg-teal-50 dark:bg-teal-950/40",
                      iconColor: "text-teal-600 dark:text-teal-400",
                      accent: "border-l-teal-500",
                      href: "/upload",
                      badge: null,
                      muted: false,
                    },
                    {
                      label: t.riskSummary,
                      sub: t.riskSummarySub,
                      icon: <ShieldAlert size={22} />,
                      iconBg: "bg-orange-50 dark:bg-orange-950/40",
                      iconColor: "text-orange-600 dark:text-orange-400",
                      accent: "border-l-orange-500",
                      href: "/risk-summary",
                      badge: highCount > 0 ? highCount : null,
                      muted: false,
                    },
                    {
                      label: t.contractHistory,
                      sub: t.contractHistorySub,
                      icon: <History size={22} />,
                      iconBg: "bg-slate-100 dark:bg-slate-800",
                      iconColor: "text-slate-500 dark:text-slate-400",
                      accent: "border-l-slate-400",
                      href: "/history",
                      badge: null,
                      muted: false,
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className={`flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${item.accent} rounded-lg px-5 py-10 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left ${item.muted ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`${item.iconBg} ${item.iconColor} p-2.5 rounded-lg shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {item.label}
                          {item.badge !== null && (
                            <span className="ml-1.5 text-red-600 dark:text-red-400">
                              ({item.badge})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.sub}
                        </p>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-slate-400 shrink-0"
                      />
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: t.askQuestion,
                      sub: t.askQuestionSub,
                      icon: <MessageSquare size={22} />,
                      iconBg: "bg-blue-50 dark:bg-blue-950/40",
                      iconColor: "text-blue-600 dark:text-blue-400",
                      accent: "border-l-blue-500",
                      href: "/chat",
                    },
                    {
                      label: t.complianceReport,
                      sub: t.complianceReportSub,
                      icon: <BarChart2 size={22} />,
                      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
                      iconColor: "text-indigo-600 dark:text-indigo-400",
                      accent: "border-l-indigo-500",
                      href: "/compliance-report",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className={`flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${item.accent} rounded-lg px-4 py-10 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left`}
                    >
                      <div
                        className={`${item.iconBg} ${item.iconColor} p-2.5 rounded-lg shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.sub}
                        </p>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-slate-400 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent Activity ── */}
            <div className="mb-6 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t.recentActivity}
                </h2>
                <button
                  onClick={() => router.push("/history")}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 transition-colors"
                >
                  View All <ArrowRight size={12} />
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {recentActivity.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    {t.noActivity}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentActivity.map((c) => {
                      const isCritical = c.critical_flags_count > 0;
                      const isFailed = c.status === "failed";
                      const isCompleted = c.status === "completed";
                      const isProcessing =
                        c.status === "processing" || c.status === "queued";

                      const iconEl = isFailed ? (
                        <XCircle size={16} className="text-red-500" />
                      ) : isCritical ? (
                        <AlertTriangle size={16} className="text-amber-500" />
                      ) : isCompleted ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <Clock size={16} className="text-slate-400" />
                      );

                      const eventText = isFailed
                        ? t.analysisFailed
                        : isCritical
                          ? `${c.critical_flags_count} critical flag${c.critical_flags_count !== 1 ? "s" : ""} detected`
                          : isCompleted
                            ? `${t.analysedRisk} ${c.risk_score}`
                            : isProcessing
                              ? t.processingText
                              : t.uploaded;

                      const timeAgo = c.upload_date
                        ? (() => {
                            const diff =
                              Date.now() - new Date(c.upload_date).getTime();
                            const mins = Math.floor(diff / 60000);
                            const hrs = Math.floor(mins / 60);
                            const days = Math.floor(hrs / 24);
                            if (days > 0) return `${days}d ago`;
                            if (hrs > 0) return `${hrs}h ago`;
                            if (mins > 0) return `${mins}m ago`;
                            return "just now";
                          })()
                        : "—";

                      return (
                        <div
                          key={c.contract_id}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          onClick={() =>
                            isCompleted
                              ? router.push(
                                  `/report/${c.contract_id}?view=compact`,
                                )
                              : router.push("/history")
                          }
                        >
                          <div className="shrink-0">{iconEl}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {c.worker_name ||
                                c.original_filename ||
                                "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {eventText}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                            {timeAgo}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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
