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
} from "lucide-react";
import { translations } from "@/lib/i18n/landing";
import type { Lang } from "@/lib/i18n/landing";
import type { Contract, Status } from "@/types";
import { useToast } from "@/context/ToastContext";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function getStatusMeta(status: Status) {
  switch (status) {
    case "completed":
      return {
        icon: <CheckCircle size={14} className="text-emerald-500" />,
        color: "text-emerald-600",
        bg: "bg-emerald-50 border-emerald-200",
      };
    case "processing":
      return {
        icon: <Loader2 size={14} className="text-amber-500 animate-spin" />,
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
      };
    case "queued":
      return {
        icon: <Clock size={14} className="text-slate-400" />,
        color: "text-slate-500",
        bg: "bg-slate-50 border-slate-200",
      };
    case "failed":
      return {
        icon: <XCircle size={14} className="text-red-500" />,
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
      };
    default:
      return {
        icon: null,
        color: "text-slate-400",
        bg: "bg-slate-50 border-slate-200",
      };
  }
}

function getRiskColor(score: number | null) {
  if (!score) return "text-slate-400";
  if (score >= 71) return "text-red-600";
  if (score >= 41) return "text-amber-600";
  return "text-emerald-600";
}

const PAGE_SIZE = 15;

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
  const [retryingId, setRetryingId] = useState<string | null>(null);

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

  const handleRetry = async (contractId: string) => {
    setRetryingId(contractId);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status: "queued" })
        .eq("id", contractId);
      if (error) throw error;
      showToast("Contract requeued for processing.");
      fetchContracts();
    } catch {
      showToast("Retry failed. Please try again.", "error");
    } finally {
      setRetryingId(null);
    }
  };

  const t = translations[lang].history;
  const tDash = translations[lang].dashboard;

  const filtered = contracts.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch =
      !search ||
      c.worker_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.employer_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const FILTERS: { key: Status | "all"; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "completed", label: t.filterCompleted },
    { key: "processing", label: t.filterProcessing },
    { key: "queued", label: t.filterQueued },
    { key: "failed", label: t.filterFailed },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent">
        <h1 className="text-lg font-bold text-slate-900 mb-3">{t.title}</h1>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
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
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === key
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-xs text-slate-400 mb-3">
          {filtered.length} {t.records}
        </p>

        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-900 font-semibold text-base">
              {t.emptyHeading}
            </p>
            <p className="text-slate-400 text-sm mt-1">{t.emptyDesc}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {paginated.map((contract) => {
              const meta = getStatusMeta(contract.status);
              const clickable = contract.status === "completed";
              const isFailed = contract.status === "failed";
              const isRetrying = retryingId === contract.id;

              return (
                <div
                  key={contract.id}
                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all"
                >
                  <button
                    onClick={() =>
                      clickable && router.push(`/report/${contract.id}`)
                    }
                    disabled={!clickable}
                    className={`w-full text-left ${clickable ? "hover:opacity-90 active:opacity-70" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-lg">📄</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {contract.worker_name ?? t.notSpecified}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {contract.employer_name ?? t.notSpecified}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {contract.country ?? t.notSpecified} ·{" "}
                          {contract.upload_date?.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}
                        >
                          {meta.icon}
                          {
                            tDash[
                              `status${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}` as keyof typeof tDash
                            ]
                          }
                        </span>
                        {contract.risk_score != null && (
                          <span
                            className={`text-xs font-semibold ${getRiskColor(contract.risk_score)}`}
                          >
                            {t.risk}: {contract.risk_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isFailed && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleRetry(contract.id)}
                        disabled={isRetrying}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw
                          size={12}
                          className={isRetrying ? "animate-spin" : ""}
                        />
                        {isRetrying ? "Retrying…" : tDash.actionRetry}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 transition-colors"
              >
                Load more
              </button>
            )}
          </div>
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
