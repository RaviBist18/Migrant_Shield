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
  Share2,
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
  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Share
  const [shareModal, setShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareRevoked, setShareRevoked] = useState(false);
  const [shareContractId, setShareContractId] = useState<string | null>(null);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/report/share/${shareToken}`
    : "";

  const handleShare = async (contractId: string) => {
    setShareLoading(contractId);
    setShareRevoked(false);
    setShareToken(null);
    setShareContractId(contractId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/report/${contractId}/share`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShareToken(data.share_token);
      setShareModal(true);
    } catch {
      showToast("Failed to generate share link.", "error");
    } finally {
      setShareLoading(null);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareContractId) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/report/${shareContractId}/share`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      setShareToken(null);
      setShareRevoked(true);
    } catch {}
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

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
                    {/* Actions */}
                    <div className="w-20 flex items-center justify-end gap-1.5 shrink-0">
                      {clickable && (
                        <button
                          onClick={() => handleShare(contract.contract_id)}
                          disabled={shareLoading === contract.contract_id}
                          title="Share"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                          {shareLoading === contract.contract_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Share2 size={13} />
                          )}
                        </button>
                      )}
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
      {/* Share Modal */}
      {shareModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            padding: "1rem",
          }}
        >
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-white" />
                <p className="text-white text-sm font-semibold">Share Report</p>
              </div>
              <button
                onClick={() => setShareModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {shareRevoked ? (
                <div className="text-center py-4">
                  <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    Link revoked
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    This share link is no longer active.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Share link (valid 30 days)
                    </p>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                      <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono truncate">
                        {shareUrl}
                      </p>
                      <button
                        onClick={handleCopyShareLink}
                        className="shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {shareCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(
                          `MigrantShield Contract Report: ${shareUrl}`,
                        );
                        window.open(`https://wa.me/?text=${text}`, "_blank");
                      }}
                      className="bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(
                          `MigrantShield Contract Report: ${shareUrl}`,
                        );
                        window.open(`viber://forward?text=${text}`, "_blank");
                      }}
                      className="bg-[#7360f2] hover:bg-[#5b4ac4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.03 4.453.36 7.34.286 10.943c-.073 3.601-.16 10.348 6.333 12.168h.006l-.006 2.789s-.042.812.504.977c.657.2 1.047-.425 1.677-1.109.347-.373.825-.92 1.186-1.337 3.27.275 5.784-.353 6.072-.446.66-.214 4.397-.693 5.005-5.655.627-5.109-.305-8.334-1.97-9.789l-.001-.002c-.483-.435-2.42-1.856-6.218-2.077a18.703 18.703 0 0 0-1.476-.46zM11.46 1.5h.046c3.38.186 5.102 1.424 5.522 1.808 1.418 1.24 2.2 4.124 1.65 8.497-.512 4.178-3.487 4.462-4.04 4.641-.24.078-2.499.626-5.344.44 0 0-2.12 2.558-2.783 3.223-.104.106-.223.149-.302.128-.112-.029-.143-.166-.141-.366l.031-3.133c-.001 0-.001-.001 0-.001-5.548-1.538-5.47-7.363-5.406-10.498.067-3.224.617-5.724 2.34-7.406C5.388 1.767 8.88 1.476 11.46 1.5zm.24 2.574c-.355-.005-.356.545-.001.552 2.833.058 4.199 1.378 4.248 4.115.007.357.559.35.552-.007-.056-3.053-1.647-4.601-4.799-4.66zm-.866 1.574a.276.276 0 0 0-.271.283c.003.152.128.274.28.271 1.865-.044 2.924.98 2.875 2.79a.277.277 0 0 0 .271.284.276.276 0 0 0 .281-.27c.057-2.105-1.22-3.309-3.436-3.358zm-2.138.532c-.376-.09-.924.05-1.208.86 0 0-.27.628-.242 1.655.03 1.028.29 2.432 1.168 3.665.88 1.234 2.79 2.669 4.984 3.009 0 0 .536.09.861-.174.244-.198.48-.647.538-.951.06-.316-.089-.482-.258-.554l-1.749-.797c-.175-.08-.418-.026-.54.212l-.355.685c-.108.196-.322.25-.536.168C10.01 13.57 8.47 11.9 8.196 10.37c-.04-.222.016-.425.208-.54l.68-.407c.235-.14.274-.38.191-.564l-.79-1.767c-.073-.162-.244-.44-.59-.513zm3.023.86a.276.276 0 0 0-.27.284c.015.69.38 1.022 1.038 1.037a.276.276 0 0 0 .283-.27.276.276 0 0 0-.27-.284c-.41-.009-.522-.103-.53-.496a.276.276 0 0 0-.251-.271z" />
                      </svg>
                      Viber
                    </button>
                    <button
                      onClick={() => {
                        window.open(
                          `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=181374994990&redirect_uri=${encodeURIComponent(shareUrl)}`,
                          "_blank",
                        );
                      }}
                      className="bg-[#0084ff] hover:bg-[#006ed4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
                      </svg>
                      Messenger
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: "MigrantShield Report",
                            url: shareUrl,
                          });
                        } else {
                          window.open(
                            `sms:?body=${encodeURIComponent(`MigrantShield Contract Report: ${shareUrl}`)}`,
                            "_blank",
                          );
                        }
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      More / SMS
                    </button>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                      Anyone with this link can view the full report. No login
                      required.
                    </p>
                    <button
                      onClick={handleRevokeShare}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
                    >
                      Revoke link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
