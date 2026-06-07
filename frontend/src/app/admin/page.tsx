"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  LogOut,
  ChevronRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

interface ReviewItem {
  review_id: string;
  contract_id: string;
  reason: string;
  status: "pending" | "reviewed" | "rejected";
  created_at: string;
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

export default function AdminPage() {
  const { user, session, loading, logout } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "reviewed" | "rejected"
  >("pending");
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user || user.id !== ADMIN_USER_ID) {
      router.replace("/dashboard");
    }
  }, [user, loading]);

  const fetchQueue = useCallback(async () => {
    if (!session?.access_token) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/review/queue`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (e: any) {
      setError(e.message || "Failed to load queue.");
    } finally {
      setFetching(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  if (loading || !user || user.id !== ADMIN_USER_ID) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered =
    filter === "all" ? queue : queue.filter((r) => r.status === filter);
  const pendingCount = queue.filter((r) => r.status === "pending").length;
  const reviewedCount = queue.filter((r) => r.status === "reviewed").length;
  const rejectedCount = queue.filter((r) => r.status === "rejected").length;

  const statusIcon = (status: string) => {
    if (status === "pending")
      return <Clock className="w-3.5 h-3.5 text-amber-400" />;
    if (status === "reviewed")
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  };

  const statusBadge = (status: string) => {
    if (status === "pending")
      return "border-amber-800/60 text-amber-400 bg-amber-900/20";
    if (status === "reviewed")
      return "border-emerald-800/60 text-emerald-400 bg-emerald-900/20";
    return "border-red-800/60 text-red-400 bg-red-900/20";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              MigrantShield Admin
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:block">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchQueue}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-400 ${fetching ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Pending Review",
              count: pendingCount,
              color: "text-amber-400",
              border: "border-amber-900/40",
            },
            {
              label: "Reviewed",
              count: reviewedCount,
              color: "text-emerald-400",
              border: "border-emerald-900/40",
            },
            {
              label: "Rejected",
              count: rejectedCount,
              color: "text-red-400",
              border: "border-red-900/40",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-slate-900 border ${s.border} rounded-xl p-4`}
            >
              <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-slate-800 pb-0">
          {(["pending", "reviewed", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                filter === f
                  ? "border-slate-100 text-slate-100"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {f}
              <span className="ml-1.5 text-xs opacity-60">
                {f === "all"
                  ? queue.length
                  : queue.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/60 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Queue list */}
        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">
              No {filter === "all" ? "" : filter} reviews
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {filter === "pending" ? "All caught up." : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <button
                key={item.review_id}
                onClick={() => router.push(`/admin/review/${item.review_id}`)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-5 text-left transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {statusIcon(item.status)}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBadge(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                      {item.reason}
                    </p>
                    <p className="text-xs text-slate-600 font-mono mt-2 truncate">
                      {item.contract_id}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
