"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/context/AuthContext";
import {
  Upload,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Lang } from "@/lib/i18n/landing";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface ContractNotif {
  contract_id: string;
  status: string;
  worker_name?: string;
  original_filename?: string;
  upload_date?: string;
  risk_score?: number;
}

export default function GlobalHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(() =>
    typeof window !== "undefined"
      ? ((localStorage.getItem("lang") as Lang) ?? "en")
      : "en",
  );
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<ContractNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellSeen, setBellSeen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // ── Lang sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setLang((localStorage.getItem("lang") as Lang) ?? "en");
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  // ── Click outside ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Notifications: realtime fetch ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("contracts")
        .select(
          "contract_id, status, worker_name, original_filename, upload_date, risk_score",
        )
        .eq("user_id", user.id)
        .in("status", ["failed", "processing", "queued", "completed"])
        .order("upload_date", { ascending: false })
        .limit(20);

      if (data) {
        const notifs = data as ContractNotif[];
        setNotifications(notifs);
        // Unread = failed + stuck processing (>10min)
        const now = Date.now();
        const unread = notifs.filter((c) => {
          if (c.status === "failed") return true;
          if (c.status === "processing" || c.status === "queued") {
            const age = c.upload_date
              ? now - new Date(c.upload_date).getTime()
              : 0;
            return age > 10 * 60 * 1000;
          }
          return false;
        });
        setUnreadCount(unread.length);
      }
    };

    fetchNotifs();

    const channel = supabase
      .channel("header-notifs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contracts",
          filter: `user_id=eq.${user.id}`,
        },
        fetchNotifs,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/admin")
  )
    return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const toggleLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
    window.dispatchEvent(new Event("langchange"));
    setOpen(false);
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? "?");

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "";

  const getNotifIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;
      case "failed":
        return <XCircle size={13} className="text-red-500 shrink-0" />;
      case "processing":
        return <Clock size={13} className="text-amber-500 shrink-0" />;
      default:
        return <Clock size={13} className="text-slate-400 shrink-0" />;
    }
  };

  const recentNotifs = notifications.slice(0, 8);
  const failedCount = notifications.filter((c) => c.status === "failed").length;
  const stuckCount = notifications.filter((c) => {
    if (c.status !== "processing" && c.status !== "queued") return false;
    return c.upload_date
      ? Date.now() - new Date(c.upload_date).getTime() > 10 * 60 * 1000
      : false;
  }).length;

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* ── Brand ── */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 shrink-0"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-slate-900 dark:stroke-slate-100"
          >
            <path d="M16 3L4 8v8c0 6 5.5 10.5 12 13 6.5-2.5 12-7 12-13V8L16 3z" />
            <path d="M13 14h4M13 18h6" />
            <path d="M19 10l-2-2-4 4" />
          </svg>
          <span className="text-slate-900 dark:text-slate-100 font-bold text-base tracking-tight">
            MigrantShield
          </span>
        </Link>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1.5">
          {/* Upload CTA */}
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-medium px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <Upload size={14} />{" "}
            <span suppressHydrationWarning>
              {lang === "ne" ? "अपलोड" : "Upload"}
            </span>
          </button>

          {/* ── Lang toggle ── */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => toggleLang("en")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                lang === "en"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => toggleLang("ne")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                lang === "ne"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              नेपाली
            </button>
          </div>

          {/* ── Notification bell ── */}
          {!loading && user && (
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => {
                  setBellOpen((v) => !v);
                  setBellSeen(true);
                  setUnreadCount(0);
                }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell
                  size={18}
                  className="text-slate-600 dark:text-slate-400"
                />
                {unreadCount > 0 && !bellSeen && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {/* Bell header */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {lang === "ne" ? "सूचनाहरू" : "Notifications"}
                      </p>
                      {(failedCount > 0 || stuckCount > 0) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {failedCount > 0 &&
                            `${failedCount} ${lang === "ne" ? "असफल" : "failed"}`}
                          {failedCount > 0 && stuckCount > 0 && " · "}
                          {stuckCount > 0 &&
                            `${stuckCount} ${lang === "ne" ? "अड्किएको" : "stuck"}`}
                        </p>
                      )}
                    </div>
                    {(failedCount > 0 || stuckCount > 0) && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} />{" "}
                        {lang === "ne" ? "ध्यान चाहिन्छ" : "Needs attention"}
                      </span>
                    )}
                  </div>

                  {/* Notif list */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {recentNotifs.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <CheckCircle2
                          size={24}
                          className="text-emerald-400 mx-auto mb-2"
                        />
                        <p className="text-sm text-slate-500">
                          {lang === "ne" ? "सबै ठीक छ" : "All clear"}
                        </p>
                      </div>
                    ) : (
                      recentNotifs.map((c) => {
                        const name =
                          c.worker_name ||
                          c.original_filename ||
                          (lang === "ne"
                            ? "नामरहित सम्झौता"
                            : "Unnamed contract");
                        const isAlert =
                          c.status === "failed" ||
                          (c.upload_date &&
                            Date.now() - new Date(c.upload_date).getTime() >
                              10 * 60 * 1000 &&
                            (c.status === "processing" ||
                              c.status === "queued"));
                        return (
                          <button
                            key={c.contract_id}
                            onClick={() => {
                              setBellOpen(false);
                              if (c.status === "completed")
                                router.push(
                                  `/report/${c.contract_id}?view=compact`,
                                );
                              else if (c.status === "failed")
                                router.push(`/failed/${c.contract_id}`);
                              else router.push("/dashboard");
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                              isAlert ? "bg-red-50/40 dark:bg-red-950/10" : ""
                            }`}
                          >
                            <div className="mt-0.5">
                              {getNotifIcon(c.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {name}
                              </p>
                              <p
                                className={`text-[11px] mt-0.5 capitalize ${
                                  c.status === "failed"
                                    ? "text-red-500"
                                    : c.status === "completed"
                                      ? "text-emerald-500"
                                      : "text-amber-500"
                                }`}
                              >
                                {c.status === "failed"
                                  ? lang === "ne"
                                    ? "विश्लेषण असफल — पुनः प्रयास गर्नुहोस्"
                                    : "Analysis failed — tap to retry"
                                  : c.status === "completed"
                                    ? `${lang === "ne" ? "जोखिम स्कोर" : "Risk score"}: ${c.risk_score ?? "—"}`
                                    : lang === "ne"
                                      ? "प्रशोधन हुँदै…"
                                      : "Processing…"}
                              </p>
                            </div>
                            {c.upload_date && (
                              <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                                {c.upload_date.slice(5, 10)}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setBellOpen(false);
                        router.push("/history");
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
                    >
                      {lang === "ne"
                        ? "सबै सम्झौताहरू हेर्नुहोस् →"
                        : "View all contracts →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Avatar dropdown ── */}
          {!loading && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="absolute right-0 top-11 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    {displayName !== user.email && (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {displayName}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      router.push("/settings");
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />{" "}
                    {lang === "ne" ? "सेटिङहरू" : "Settings"}
                  </button>

                  <button
                    onClick={() => {
                      router.push("/help");
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <HelpCircle size={15} className="text-slate-400" />{" "}
                    {lang === "ne" ? "सहायता" : "Get help"}
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={15} className="text-red-500" />{" "}
                    {lang === "ne" ? "साइन आउट" : "Log out"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !user && (
            <Link
              href="/auth/phone"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-medium text-sm rounded-lg transition-colors"
            >
              {lang === "ne" ? "साइन इन" : "Sign In"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
