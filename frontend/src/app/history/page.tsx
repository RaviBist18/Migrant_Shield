"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
  Search,
  X,
  RefreshCw,
  Trash2,
  Calendar,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { translations } from "@/lib/i18n/landing";
import type { Lang } from "@/lib/i18n/landing";
import type { Contract, Status } from "@/types";
import { useToast } from "@/context/ToastContext";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PAGE_SIZE = 15;
type SortField = "upload_date" | "risk_score" | "worker_name";
type SortDir = "asc" | "desc";

function getStatusMeta(status: Status) {
  switch (status) {
    case "completed":
      return {
        icon: <CheckCircle size={12} className="text-emerald-500" />,
        color: "text-emerald-600",
        bg: "bg-emerald-50 border-emerald-200",
        label: "Completed",
        dot: "bg-emerald-500",
      };
    case "processing":
      return {
        icon: <Loader2 size={12} className="text-amber-500 animate-spin" />,
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
        label: "Processing",
        dot: "bg-amber-500",
      };
    case "queued":
      return {
        icon: <Clock size={12} className="text-slate-400" />,
        color: "text-slate-500",
        bg: "bg-slate-50 border-slate-200",
        label: "Queued",
        dot: "bg-slate-400",
      };
    case "failed":
      return {
        icon: <XCircle size={12} className="text-red-500" />,
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        label: "Failed",
        dot: "bg-red-500",
      };
    default:
      return {
        icon: null,
        color: "text-slate-400",
        bg: "bg-slate-50 border-slate-200",
        label: status,
        dot: "bg-slate-300",
      };
  }
}

function getRiskColor(score: number | null) {
  if (!score) return "text-slate-400";
  if (score >= 71) return "text-red-600";
  if (score >= 41) return "text-amber-500";
  return "text-emerald-600";
}

function getRiskBg(score: number | null) {
  if (!score) return "";
  if (score >= 71) return "bg-red-50 border-red-200";
  if (score >= 41) return "bg-amber-50 border-amber-200";
  return "bg-emerald-50 border-emerald-200";
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
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
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

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [lang, setLang] = useState<Lang>("en");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [page, setPage] = useState(1);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // Sort
  const [sortField, setSortField] = useState<SortField>("upload_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Lang ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("lang");
      setLang(stored === "ne" ? "ne" : "en");
    };
    sync();
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  useEffect(() => {
    const urlStatus = searchParams.get("status") as Status | null;
    if (urlStatus) setFilter(urlStatus);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchContracts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/phone");
      return;
    }
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("user_id", user.id)
      .order("upload_date", { ascending: false });
    setContracts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContracts();
    const channel = supabase
      .channel("history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracts" },
        fetchContracts,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContracts]);

  // ── Retry ─────────────────────────────────────────────────────────────────────
  const handleRetry = async (contractId: string) => {
    setRetryingIds((prev) => new Set(prev).add(contractId));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contracts/${contractId}/reanalyze`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      showToast("Contract requeued for processing.");
      fetchContracts();
    } catch {
      showToast("Retry failed. Please try again.", "error");
    } finally {
      setRetryingIds((prev) => {
        const s = new Set(prev);
        s.delete(contractId);
        return s;
      });
    }
  };

  // ── Delete individual ─────────────────────────────────────────────────────────
  const handleDeleteOne = async (contractId: string) => {
    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("contract_id", contractId);
    if (!error) {
      setContracts((prev) => prev.filter((c) => c.contract_id !== contractId));
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(contractId);
        return s;
      });
      showToast("Contract deleted.");
    } else {
      showToast("Delete failed.", "error");
    }
  };

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
        showToast(
          `${ids.length} contract${ids.length > 1 ? "s" : ""} deleted.`,
        );
      }
    } catch {
      showToast("Bulk delete failed.", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ── Delete all failed ─────────────────────────────────────────────────────────
  const handleDeleteAllFailed = async () => {
    const failedIds = contracts
      .filter((c) => c.status === "failed")
      .map((c) => c.contract_id);
    if (!failedIds.length) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .in("contract_id", failedIds);
      if (!error) {
        setContracts((prev) => prev.filter((c) => c.status !== "failed"));
        setSelectedIds(new Set());
        showToast(
          `${failedIds.length} failed contract${failedIds.length > 1 ? "s" : ""} deleted.`,
        );
      }
    } catch {
      showToast("Delete failed.", "error");
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

  const toggleSelectAll = () => {
    const visibleIds = paginated.map((c) => c.contract_id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // ── Sort toggle ───────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const t = translations[lang].history;
  const tDash = translations[lang].dashboard;

  const failedCount = contracts.filter((c) => c.status === "failed").length;

  // ── Filter + search + date ────────────────────────────────────────────────────
  const filtered = contracts.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (c.worker_name ?? "").toLowerCase().includes(q) ||
      (c.employer_name ?? "").toLowerCase().includes(q) ||
      (c.country ?? "").toLowerCase().includes(q) ||
      (c.original_filename ?? "").toLowerCase().includes(q);

    const uploadDate = c.upload_date ? c.upload_date.slice(0, 10) : "";
    const matchFrom = !dateFrom || uploadDate >= dateFrom;
    const matchTo = !dateTo || uploadDate <= dateTo;

    return matchStatus && matchSearch && matchFrom && matchTo;
  });

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortField === "upload_date") {
      av = a.upload_date ?? "";
      bv = b.upload_date ?? "";
    } else if (sortField === "risk_score") {
      av = a.risk_score ?? 0;
      bv = b.risk_score ?? 0;
    } else if (sortField === "worker_name") {
      av = (a.worker_name ?? a.original_filename ?? "").toLowerCase();
      bv = (b.worker_name ?? b.original_filename ?? "").toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < sorted.length;
  const allPageSelected =
    paginated.length > 0 &&
    paginated.every((c) => selectedIds.has(c.contract_id));

  const FILTERS: { key: Status | "all"; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "completed", label: t.filterCompleted },
    { key: "processing", label: t.filterProcessing },
    { key: "queued", label: t.filterQueued },
    { key: "failed", label: t.filterFailed },
  ];

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
        sortField === field
          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
      }`}
    >
      {label}
      {sortField === field ? (
        sortDir === "asc" ? (
          <ChevronUp size={11} />
        ) : (
          <ChevronDown size={11} />
        )
      ) : (
        <ArrowUpDown size={11} className="opacity-40" />
      )}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 max-w-6xl mx-auto">
      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}

      {/* ── Header / search / filters ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-5 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {sorted.length} {t.records}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete all ${failedCount} failed contracts? This cannot be undone.`,
                    )
                  ) {
                    handleDeleteAllFailed();
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 dark:border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={12} /> Delete all failed ({failedCount})
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === key
                  ? key === "failed"
                    ? "bg-red-600 border-red-600 text-white"
                    : key === "completed"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : key === "processing"
                        ? "bg-amber-500 border-amber-500 text-white"
                        : key === "queued"
                          ? "bg-slate-500 border-slate-500 text-white"
                          : "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
              }`}
            >
              {label}
              {key === "failed" && failedCount > 0 && ` (${failedCount})`}
            </button>
          ))}
        </div>

        {/* Sort + date range row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Sort:</span>
          <SortBtn field="upload_date" label="Date" />
          <SortBtn field="risk_score" label="Risk" />
          <SortBtn field="worker_name" label="Name" />

          <button
            onClick={() => setShowDateFilter((v) => !v)}
            className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
              dateFrom || dateTo
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900"
                : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            <Calendar size={12} /> Date range
            {(dateFrom || dateTo) && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setDateFrom("");
                  setDateTo("");
                }}
                className="ml-1 hover:opacity-70"
              >
                <X size={10} />
              </span>
            )}
          </button>
        </div>

        {/* Date range inputs */}
        {showDateFilter && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5">
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
              className="text-xs text-slate-400 hover:text-slate-700 ml-auto"
            >
              Clear
            </button>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {loading && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 animate-pulse"
              >
                <div className="w-3.5 h-3.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0" />
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded shrink-0" />
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="w-16 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-900 dark:text-slate-100 font-semibold text-base">
              {t.emptyHeading}
            </p>
            <p className="text-slate-400 text-sm mt-1">{t.emptyDesc}</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <>
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2 mb-1">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide flex-1">
                Contract
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide w-24 text-right hidden sm:block">
                {filter === "failed" ? "Error" : "Employer"}
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide w-20 text-center">
                Risk
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide w-24 text-right">
                Status
              </span>
              <span className="w-14 shrink-0" />
            </div>

            {/* Rows — grouped card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map((contract) => {
                const meta = getStatusMeta(contract.status);
                const clickable = contract.status === "completed";
                const isFailed = contract.status === "failed";
                const isRetrying = retryingIds.has(contract.contract_id);
                const isSelected = selectedIds.has(contract.contract_id);
                const displayName =
                  contract.worker_name ||
                  contract.original_filename ||
                  t.notSpecified;

                return (
                  <div
                    key={contract.contract_id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                      isSelected
                        ? "bg-slate-50 dark:bg-slate-800/40"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(contract.contract_id)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 shrink-0"
                    />

                    {/* File icon */}
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-slate-400" />
                    </div>

                    {/* Name + filename — clickable */}
                    <button
                      onClick={() => {
                        if (clickable) {
                          router.push(
                            `/report/${contract.contract_id}?view=compact`,
                          );
                        } else if (isFailed) {
                          router.push(`/failed/${contract.contract_id}`);
                        } else if (contract.status === "processing") {
                          showToast(
                            "Analysis in progress. This page auto-updates when complete.",
                          );
                        } else if (contract.status === "queued") {
                          showToast(
                            "Waiting in queue. Analysis will begin shortly.",
                          );
                        }
                      }}
                      className={`flex-1 min-w-0 text-left ${clickable || isFailed ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <p
                        className={`text-sm font-medium truncate leading-tight ${
                          clickable
                            ? "text-slate-900 dark:text-slate-100 group-hover:text-slate-700"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                        {contract.original_filename && contract.worker_name
                          ? contract.original_filename
                          : `${contract.country ?? ""} · ${contract.upload_date?.slice(0, 10) ?? ""}`}
                      </p>
                    </button>

                    {/* Employer or error reason */}
                    <span
                      className={`text-xs truncate w-24 text-right hidden sm:block shrink-0 ${
                        filter === "failed" && contract.error_reason
                          ? "text-red-400 dark:text-red-500"
                          : "text-slate-400"
                      }`}
                    >
                      {filter === "failed"
                        ? (contract.error_reason ?? "Unknown error")
                        : (contract.employer_name ?? "—")}
                    </span>

                    {/* Risk score */}
                    <div className="w-20 flex justify-center shrink-0">
                      {contract.risk_score != null &&
                      contract.risk_score > 0 ? (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${getRiskBg(contract.risk_score)} ${getRiskColor(contract.risk_score)}`}
                        >
                          {contract.risk_score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="w-24 flex justify-end shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-14 flex items-center justify-end gap-1.5 shrink-0">
                      {isFailed && (
                        <button
                          onClick={() => handleRetry(contract.contract_id)}
                          disabled={isRetrying}
                          title="Retry"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                          <RefreshCw
                            size={13}
                            className={isRetrying ? "animate-spin" : ""}
                          />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOne(contract.contract_id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="mt-3 w-full py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 transition-colors"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}
    >
      <HistoryContent />
    </Suspense>
  );
}
