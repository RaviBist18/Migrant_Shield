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
  ChevronUp,
  ChevronDown,
  FileText,
  Share2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

type SortField = "upload_date" | "risk_score" | "worker_name";
type SortDir = "asc" | "desc";
type FilterType =
  | "all"
  | "completed"
  | "processing"
  | "queued"
  | "failed"
  | "critical";

function isStuck(contract: Contract): boolean {
  if (contract.status !== "processing" && contract.status !== "queued")
    return false;
  const uploadTime = contract.upload_date
    ? new Date(contract.upload_date).getTime()
    : null;
  if (!uploadTime) return false;
  return Date.now() - uploadTime > STUCK_THRESHOLD_MS;
}

function getStatusMeta(status: Status) {
  switch (status) {
    case "completed":
      return {
        icon: <CheckCircle size={13} />,
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        label: "Completed",
      };
    case "processing":
      return {
        icon: <Loader2 size={13} className="animate-spin" />,
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
        label: "Processing",
      };
    case "queued":
      return {
        icon: <Clock size={13} />,
        color: "text-slate-500",
        bg: "bg-slate-50 border-slate-200",
        label: "Queued",
      };
    case "failed":
      return {
        icon: <XCircle size={13} />,
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        label: "Failed",
      };
    default:
      return {
        icon: null,
        color: "text-slate-400",
        bg: "bg-slate-50 border-slate-200",
        label: status,
      };
  }
}

function getRiskMeta(score: number) {
  if (score >= 71)
    return {
      color: "text-red-700 font-bold",
      badge: "bg-red-50 border border-red-200 text-red-700",
    };
  if (score >= 41)
    return {
      color: "text-amber-700 font-bold",
      badge: "bg-amber-50 border border-amber-200 text-amber-700",
    };
  return {
    color: "text-emerald-700 font-bold",
    badge: "bg-emerald-50 border border-emerald-200 text-emerald-700",
  };
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
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

// ─── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({
  shareUrl,
  shareCopied,
  shareRevoked,
  onCopy,
  onRevoke,
  onClose,
}: {
  shareUrl: string;
  shareCopied: boolean;
  shareRevoked: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-slate-900 dark:bg-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-white" />
            <p className="text-white text-sm font-semibold">Share Report</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
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
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                  <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono truncate">
                    {shareUrl}
                  </p>
                  <button
                    onClick={onCopy}
                    className="shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {shareCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`MigrantShield Contract Report: ${shareUrl}`)}`,
                      "_blank",
                    )
                  }
                  className="bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
                  onClick={() =>
                    window.open(
                      `viber://forward?text=${encodeURIComponent(`MigrantShield Contract Report: ${shareUrl}`)}`,
                      "_blank",
                    )
                  }
                  className="bg-[#7360f2] hover:bg-[#5b4ac4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=181374994990&redirect_uri=${encodeURIComponent(shareUrl)}`,
                      "_blank",
                    )
                  }
                  className="bg-[#0084ff] hover:bg-[#006ed4] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
                <p className="text-xs text-slate-400 mb-2">
                  Anyone with this link can view the full report. No login
                  required.
                </p>
                <button
                  onClick={onRevoke}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Revoke link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [lang, setLang] = useState<Lang>("en");
  const [contracts, setContracts] = useState<
    (Contract & { critical_flags_count: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("upload_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllFailedMode, setDeleteAllFailedMode] = useState(false);
  const [deleteOneId, setDeleteOneId] = useState<string | null>(null);

  // Share state
  const [shareModal, setShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareRevoked, setShareRevoked] = useState(false);
  const [shareContractId, setShareContractId] = useState<string | null>(null);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/report/share/${shareToken}`
    : "";

  // ── Lang ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setLang((localStorage.getItem("lang") as Lang) ?? "en");
    sync();
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  useEffect(() => {
    const urlFilter = searchParams.get("filter") as FilterType | null;
    if (urlFilter) setFilter(urlFilter);
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
      .select(`*, critical_flags_count:contract_flags(count)`)
      .eq("user_id", user.id)
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
  }, []);

  useEffect(() => {
    fetchContracts();
    const channel = supabase
      .channel("history-realtime")
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

  // ── Share ─────────────────────────────────────────────────────────────────────
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

  // ── Retry ─────────────────────────────────────────────────────────────────────
  const handleRetry = async (contractId: string) => {
    setRetryingIds((prev) => new Set(prev).add(contractId));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error();
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

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDeleteOne = (contractId: string) => {
    setDeleteOneId(contractId);
    setShowDeleteModal(true);
  };

  const confirmDeleteOne = async () => {
    if (!deleteOneId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("contract_id", deleteOneId);
    if (!error) {
      setContracts((prev) => prev.filter((c) => c.contract_id !== deleteOneId));
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(deleteOneId);
        return s;
      });
      showToast("Contract deleted.");
    } else {
      showToast("Delete failed.", "error");
    }
    setDeleting(false);
    setShowDeleteModal(false);
    setDeleteOneId(null);
  };

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

  const handleDeleteAllFailed = () => {
    const failedIds = contracts
      .filter((c) => c.status === "failed")
      .map((c) => c.contract_id);
    if (!failedIds.length) return;
    setDeleteAllFailedMode(true);
    setShowDeleteModal(true);
  };

  const confirmDeleteAllFailed = async () => {
    const failedIds = contracts
      .filter((c) => c.status === "failed")
      .map((c) => c.contract_id);
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
      setDeleteAllFailedMode(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const t = translations[lang].history;
  const failedCount = contracts.filter((c) => c.status === "failed").length;
  const criticalCount = contracts.reduce(
    (sum, c) => sum + (c.critical_flags_count ?? 0),
    0,
  );

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filtered = contracts.filter((c) => {
    const matchFilter =
      filter === "all"
        ? true
        : filter === "critical"
          ? (c.critical_flags_count ?? 0) > 0
          : filter === "processing"
            ? c.status === "processing" || c.status === "queued"
            : c.status === filter;

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

    return matchFilter && matchSearch && matchFrom && matchTo;
  });

  // ── Sort ──────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number =
      sortField === "upload_date"
        ? (a.upload_date ?? "")
        : sortField === "risk_score"
          ? (a.risk_score ?? 0)
          : (a.worker_name ?? a.original_filename ?? "").toLowerCase();
    let bv: string | number =
      sortField === "upload_date"
        ? (b.upload_date ?? "")
        : sortField === "risk_score"
          ? (b.risk_score ?? 0)
          : (b.worker_name ?? b.original_filename ?? "").toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedIds = paginated.map((c) => c.contract_id);
  const allPageSelected =
    paginatedIds.length > 0 && paginatedIds.every((id) => selectedIds.has(id));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-slate-600" />
    ) : (
      <ChevronDown size={12} className="text-slate-600" />
    );
  };

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: t.filterAll },
    { key: "completed", label: t.filterCompleted },
    { key: "processing", label: t.filterProcessing },
    { key: "queued", label: t.filterQueued },
    { key: "failed", label: t.filterFailed, count: failedCount },
    { key: "critical", label: t.filterCritical, count: criticalCount },
  ];

  const EmptyState = ({
    filter,
    onClear,
    onUpload,
  }: {
    filter: FilterType;
    onClear: () => void;
    onUpload: () => void;
  }) => {
    const messages: Record<
      FilterType,
      {
        icon: React.ReactNode;
        heading: string;
        sub: string;
        action?: { label: string; fn: () => void };
      }
    > = {
      all: {
        icon: <FileText size={28} className="text-slate-400" />,
        heading: t.emptyAllHeading,
        sub: t.emptyAllSub,
        action: { label: t.emptyAllCta, fn: onUpload },
      },
      completed: {
        icon: <CheckCircle size={28} className="text-emerald-400" />,
        heading: t.emptyCompletedHeading,
        sub: t.emptyCompletedSub,
      },
      processing: {
        icon: <Loader2 size={28} className="text-amber-400" />,
        heading: t.emptyProcessingHeading,
        sub: t.emptyProcessingSub,
      },
      queued: {
        icon: <Clock size={28} className="text-slate-400" />,
        heading: t.emptyQueuedHeading,
        sub: t.emptyQueuedSub,
      },
      failed: {
        icon: <XCircle size={28} className="text-red-400" />,
        heading: t.emptyFailedHeading,
        sub: t.emptyFailedSub,
      },
      critical: {
        icon: <AlertTriangle size={28} className="text-orange-400" />,
        heading: t.emptyCriticalHeading,
        sub: t.emptyCriticalSub,
      },
    };

    const m = messages[filter];
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          {m.icon}
        </div>
        <div>
          <p className="text-slate-800 dark:text-slate-200 font-semibold text-base">
            {m.heading}
          </p>
          <p className="text-slate-500 text-sm mt-1">{m.sub}</p>
        </div>
        {m.action && (
          <button
            onClick={m.action.fn}
            className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {m.action.label}
          </button>
        )}
        {filter !== "all" && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            {t.clearFilter}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {showDeleteModal && (
        <DeleteModal
          count={
            deleteAllFailedMode
              ? contracts.filter((c) => c.status === "failed").length
              : deleteOneId
                ? 1
                : selectedIds.size
          }
          onConfirm={
            deleteAllFailedMode
              ? confirmDeleteAllFailed
              : deleteOneId
                ? confirmDeleteOne
                : handleBulkDelete
          }
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteAllFailedMode(false);
            setDeleteOneId(null);
          }}
          loading={deleting}
        />
      )}
      {shareModal && (
        <ShareModal
          shareUrl={shareUrl}
          shareCopied={shareCopied}
          shareRevoked={shareRevoked}
          onCopy={handleCopyShareLink}
          onRevoke={handleRevokeShare}
          onClose={() => setShareModal(false)}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Page header ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium mb-4"
        >
          <ChevronLeft size={16} /> {t.back}
        </button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {sorted.length} {t.records}
              {filter !== "all" && ` · ${t.filteredBy} ${filter}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <button
                onClick={handleDeleteAllFailed}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13} /> {t.deleteAllFailed} ({failedCount})
              </button>
            )}
          </div>
        </div>

        {/* ── Search + date range row ── */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
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
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={13} className="text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowDateFilter((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              dateFrom || dateTo
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900"
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            <Calendar size={13} /> {t.dateRange}
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

        {showDateFilter && (
          <div className="flex gap-2 items-center mb-4">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <span className="text-slate-400 text-xs">{t.dateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === key
                  ? key === "failed"
                    ? "bg-red-600 text-white"
                    : key === "critical"
                      ? "bg-orange-500 text-white"
                      : key === "completed"
                        ? "bg-emerald-600 text-white"
                        : key === "processing"
                          ? "bg-amber-500 text-white"
                          : key === "queued"
                            ? "bg-slate-500 text-white"
                            : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400"
              }`}
            >
              {label}
              {count !== undefined && count > 0 ? ` (${count})` : ""}
            </button>
          ))}
        </div>

        {/* ── Table container ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {selectedIds.size} {t.selected}
              </span>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} /> {t.deleteSelected}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-slate-700 ml-auto"
              >
                {t.clear}
              </button>
            </div>
          )}

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 animate-pulse"
                >
                  <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded hidden sm:block" />
                  <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 rounded hidden sm:block" />
                  <div className="w-20 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              filter={filter}
              onClear={() => {
                setFilter("all");
                setSearch("");
              }}
              onUpload={() => router.push("/upload")}
            />
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                      <th className="px-5 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={() => toggleSelectAll(paginatedIds)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[220px]">
                        <button
                          onClick={() => handleSort("worker_name")}
                          className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                        >
                          {t.colWorker} <SortIcon field="worker_name" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[140px]">
                        {t.colEmployer}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[120px]">
                        {t.colCountry}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[110px]">
                        <button
                          onClick={() => handleSort("upload_date")}
                          className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                        >
                          {t.colDate} <SortIcon field="upload_date" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[120px]">
                        {t.colStatus}
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[80px]">
                        <button
                          onClick={() => handleSort("risk_score")}
                          className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                        >
                          {t.colRisk} <SortIcon field="risk_score" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold w-[130px]">
                        {t.colFlags}
                      </th>
                      <th className="px-3 py-3 w-[140px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((contract, i) => {
                      const statusMeta = getStatusMeta(contract.status);
                      const riskMeta =
                        contract.risk_score > 0
                          ? getRiskMeta(contract.risk_score)
                          : null;
                      const stuck = isStuck(contract);
                      const isSelected = selectedIds.has(contract.contract_id);
                      const isCompleted = contract.status === "completed";
                      const isFailed = contract.status === "failed";
                      const isLast = i === paginated.length - 1;

                      return (
                        <tr
                          key={contract.contract_id}
                          onClick={() =>
                            isCompleted &&
                            router.push(
                              `/report/${contract.contract_id}?view=compact`,
                            )
                          }
                          className={`group transition-colors ${!isLast ? "border-b border-slate-100 dark:border-slate-800" : ""} ${
                            isSelected
                              ? "bg-slate-50 dark:bg-slate-800/40"
                              : isCompleted
                                ? "hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                                : "hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
                          }`}
                        >
                          <td
                            className="px-5 py-4 w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                              {contract.worker_name ||
                                contract.original_filename ||
                                "—"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {contract.contract_id?.slice(0, 8)}…
                            </p>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {contract.employer_name || "—"}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {contract.country || "—"}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-500 tabular-nums">
                            {contract.upload_date?.slice(0, 10) ?? "—"}
                          </td>
                          <td className="px-3 py-4">
                            <div
                              className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.color}`}
                            >
                              {statusMeta.icon} {statusMeta.label}
                              {stuck && (
                                <span className="text-amber-500 text-[10px] font-medium">
                                  (stuck)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            {contract.risk_score > 0 && riskMeta ? (
                              <span
                                className={`text-sm font-bold ${riskMeta.color}`}
                              >
                                {contract.risk_score}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            {(contract.critical_flags_count ?? 0) > 0 ? (
                              <span className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase whitespace-nowrap inline-flex items-center gap-1">
                                <span>{contract.critical_flags_count}</span>
                                <span>CRITICAL</span>
                              </span>
                            ) : isCompleted ? (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase whitespace-nowrap">
                                Safe
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td
                            className="px-3 py-4 w-[100px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
                              {isCompleted && (
                                <>
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/report/${contract.contract_id}?view=compact&chat=open`,
                                      )
                                    }
                                    title={
                                      lang === "ne"
                                        ? "कानूनी सहायकलाई सोध्नुहोस्"
                                        : "Ask Legal Assistant"
                                    }
                                    className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-300 text-white dark:text-slate-900 flex items-center justify-center transition-colors"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
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
                                </>
                              )}
                              {isFailed && (
                                <button
                                  onClick={() =>
                                    handleRetry(contract.contract_id)
                                  }
                                  disabled={retryingIds.has(
                                    contract.contract_id,
                                  )}
                                  className="text-amber-600 hover:text-amber-800 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw
                                    size={12}
                                    className={
                                      retryingIds.has(contract.contract_id)
                                        ? "animate-spin"
                                        : ""
                                    }
                                  />
                                  Retry
                                </button>
                              )}
                              {stuck && !isFailed && (
                                <button
                                  onClick={() =>
                                    handleRetry(contract.contract_id)
                                  }
                                  className="text-amber-600 hover:text-amber-800 text-xs flex items-center gap-1"
                                >
                                  <RefreshCw size={12} /> Retry
                                </button>
                              )}
                              {isCompleted && (
                                <button
                                  onClick={() =>
                                    handleShare(contract.contract_id)
                                  }
                                  disabled={
                                    shareLoading === contract.contract_id
                                  }
                                  title="Share"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                                >
                                  {shareLoading === contract.contract_id ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Share2 size={13} />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDeleteOne(contract.contract_id)
                                }
                                title="Delete"
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((contract) => {
                  const statusMeta = getStatusMeta(contract.status);
                  const riskMeta =
                    contract.risk_score > 0
                      ? getRiskMeta(contract.risk_score)
                      : null;
                  const stuck = isStuck(contract);
                  const isSelected = selectedIds.has(contract.contract_id);
                  const isCompleted = contract.status === "completed";
                  const isFailed = contract.status === "failed";

                  return (
                    <div
                      key={contract.contract_id}
                      className={`p-4 space-y-3 ${isSelected ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(contract.contract_id)}
                            className="mt-1 rounded border-slate-300 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {contract.worker_name ||
                                contract.original_filename ||
                                "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {contract.employer_name || "—"} ·{" "}
                              {contract.country || "—"}
                            </p>
                          </div>
                        </div>
                        {contract.risk_score > 0 && riskMeta && (
                          <span
                            className={`text-xl font-bold shrink-0 ${riskMeta.color}`}
                          >
                            {contract.risk_score}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.color}`}
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
                      <div className="flex gap-2 flex-wrap">
                        {isCompleted && (
                          <>
                            <button
                              onClick={() =>
                                router.push(
                                  `/report/${contract.contract_id}?view=compact&chat=open`,
                                )
                              }
                              className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
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
                              className="flex items-center gap-1 text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 rounded-lg"
                            >
                              View <ChevronRight size={11} />
                            </button>
                            <button
                              onClick={() => handleShare(contract.contract_id)}
                              disabled={shareLoading === contract.contract_id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors disabled:opacity-40"
                            >
                              {shareLoading === contract.contract_id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Share2 size={13} />
                              )}
                            </button>
                          </>
                        )}
                        {(isFailed || stuck) && (
                          <button
                            onClick={() => handleRetry(contract.contract_id)}
                            disabled={retryingIds.has(contract.contract_id)}
                            className="flex items-center gap-1 text-amber-600 border border-amber-200 hover:bg-amber-50 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <RefreshCw
                              size={11}
                              className={
                                retryingIds.has(contract.contract_id)
                                  ? "animate-spin"
                                  : ""
                              }
                            />
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOne(contract.contract_id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">
                    {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, sorted.length)} {t.of}{" "}
                    {sorted.length} {t.records}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="sm:hidden px-1 font-medium text-slate-600">
                      {page} / {totalPages}
                    </span>
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(totalPages, 7) },
                        (_, i) => {
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
                        },
                      )}
                    </div>
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

export default function HistoryPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}
    >
      <HistoryContent />
    </Suspense>
  );
}
