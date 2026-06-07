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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Lang } from "@/lib/i18n/landing";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function GlobalHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const isDashboard = pathname.startsWith("/dashboard");

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? "?");

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "";

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2"
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

        {/* Right */}
        <div className="flex items-center gap-2">
          {isDashboard && (
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-medium px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Upload size={14} /> Upload
            </button>
          )}

          {!loading && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="absolute right-0 top-11 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
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
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Settings
                        size={15}
                        className="text-slate-400 dark:text-slate-500"
                      />
                      Settings
                    </span>
                  </button>

                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 text-base">🌐</span>
                      Language
                    </span>
                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 flex items-center">
                      <button
                        onClick={() => toggleLang("en")}
                        className={
                          lang === "en"
                            ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white font-medium px-2 py-0.5 rounded-full text-xs shadow-sm transition-all"
                            : "text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                        }
                      >
                        EN
                      </button>
                      <button
                        onClick={() => toggleLang("ne")}
                        className={
                          lang === "ne"
                            ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white font-medium px-2 py-0.5 rounded-full text-xs shadow-sm transition-all"
                            : "text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                        }
                      >
                        नेपाली
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      router.push("/help");
                      setOpen(false);
                    }}
                    className="w-full flex justify-start items-center gap-2.5 px-5 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <HelpCircle
                      size={15}
                      className="text-slate-400 dark:text-slate-500"
                    />
                    Get help
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex justify-start items-center gap-2.5 px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut
                      size={15}
                      className="text-red-500 dark:text-red-400"
                    />
                    Log out
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
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
