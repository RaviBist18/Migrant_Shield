"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ChevronRight,
  Mail,
  KeyRound,
  ExternalLink,
  Trash2,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { translations } from "@/lib/i18n/landing";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";

type Lang = "en" | "ne";
type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLang] = useState<Lang>("en");
  const [email, setEmail] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const THEME_OPTIONS: {
    value: Theme;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      value: "light",
      icon: <Sun size={14} />,
      label: lang === "ne" ? "उज्यालो" : "Light",
    },
    {
      value: "dark",
      icon: <Moon size={14} />,
      label: lang === "ne" ? "अँध्यारो" : "Dark",
    },
    {
      value: "system",
      icon: <Monitor size={14} />,
      label: lang === "ne" ? "सिस्टम" : "System",
    },
  ];

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

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
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setEmail(user.email ?? null);
      setFullName(user.user_metadata?.full_name ?? "");
    };
    getUser();
  }, []);

  const t = translations[lang] ?? translations["en"];
  const initials = fullName
    ? fullName
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (email?.charAt(0).toUpperCase() ?? "?");

  const handlePasswordReset = async () => {
    if (!email) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      showToast(
        t?.settings?.resetSent ?? "Reset link sent — check your inbox.",
      );
    } catch (err: any) {
      showToast(err?.message ?? "Something went wrong.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (error) throw error;
      showToast("Name updated.");
    } catch (err: any) {
      showToast(err?.message ?? "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );

  const Row = ({
    icon,
    label,
    value,
    onClick,
    disabled,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm
        ${onClick && !disabled ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors" : ""}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        {value && (
          <span className="text-slate-500 dark:text-slate-400 text-xs">
            {value}
          </span>
        )}
        {onClick && !disabled && <ChevronRight className="w-4 h-4" />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24">
      <main className="flex-1 px-4 pt-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          {lang === "ne" ? "फिर्ता" : "Back"}
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {t?.settings?.title ?? "Settings"}
          </h1>
          {email && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t?.settings?.signedInAs ?? "Signed in as"} {email}
            </p>
          )}
        </div>

        {/* General */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mb-6">
          <SectionLabel label={t?.settings?.generalSection ?? "General"} />
          {/* Profile */}
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              {lang === "ne" ? "प्रोफाइल" : "Profile"}
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {lang === "ne" ? "प्रदर्शन नाम" : "Display name"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === "ne"
                    ? "तपाईंको प्रोफाइलमा देखाइन्छ"
                    : "Shown in your profile"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={
                  lang === "ne" ? "पूरा नाम लेख्नुहोस्" : "Enter your full name"
                }
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !fullName.trim()}
                className="px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors hover:bg-slate-800 dark:hover:bg-slate-200"
              >
                {saving ? "…" : lang === "ne" ? "सुरक्षित गर्नुहोस्" : "Save"}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Sun size={16} className="text-slate-400 dark:text-slate-500" />
              <span>{t?.settings?.appearance ?? "Appearance"}</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 border rounded-full p-0.5 flex">
              {THEME_OPTIONS.map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                    ${
                      theme === value
                        ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mb-6">
          <SectionLabel label={t?.settings?.accountSection ?? "Account"} />
          <Row
            icon={<Mail className="w-4 h-4" />}
            label={t?.settings?.emailLabel ?? "Email"}
            value={email ?? "—"}
          />
          <Row
            icon={<KeyRound className="w-4 h-4" />}
            label={
              resetLoading
                ? "Sending…"
                : (t?.settings?.resetPassword ?? "Reset Password")
            }
            onClick={handlePasswordReset}
            disabled={resetLoading}
          />
        </div>

        {/* Legal */}
        <div className="bg-white dark:bg-slate-900 border rounded-xl mb-6">
          <SectionLabel
            label={t?.settings?.legalSection ?? "Legal & Resources"}
          />

          {[
            {
              label: t?.settings?.privacyPolicy ?? "Privacy Policy",
              href: "/privacy",
            },
            { label: t?.settings?.terms ?? "Terms of Service", href: "/terms" },
            {
              label: t?.settings?.partnerNGOs ?? "Partner NGOs",
              href: "/partners",
            },
            { label: lang === "ne" ? "सहायता" : "Get Help", href: "/help" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 border-b last:border-0 text-sm"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4" />
                <span>{label}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </a>
          ))}
        </div>

        {/* Danger zone */}
        <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/40 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-red-100 dark:border-red-900/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
              {t?.settings?.dangerZone ?? "Danger Zone"}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 text-sm opacity-40 cursor-not-allowed">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>{t?.settings?.deleteAccount ?? "Delete Account"}</span>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Phase 4
            </span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
