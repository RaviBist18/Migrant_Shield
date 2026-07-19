"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface FilePreview {
  data: string;
  name: string;
  size: number;
  type: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ne", label: "नेपाली" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "tl", label: "Filipino" },
  { code: "bn", label: "বাংলা" },
];

export default function PreviewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("en");
  const [uiLang, setUiLang] = useState<"en" | "ne">("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "ne") setUiLang("ne");
  }, []);

  useEffect(() => {
    const sync = () =>
      setUiLang(localStorage.getItem("lang") === "ne" ? "ne" : "en");
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  useEffect(() => {
    const data = sessionStorage.getItem("upload_file_data");
    const name = sessionStorage.getItem("upload_file_name");
    const size = sessionStorage.getItem("upload_file_size");
    const type = sessionStorage.getItem("upload_file_type");

    if (!data || !name || !size || !type) {
      router.replace("/upload");
      return;
    }

    setPreview({ data, name, size: Number(size), type });
  }, []);

  const handleClear = () => {
    sessionStorage.removeItem("upload_file_data");
    sessionStorage.removeItem("upload_file_name");
    sessionStorage.removeItem("upload_file_size");
    sessionStorage.removeItem("upload_file_type");
    router.replace("/upload");
  };

  const submitRef = useRef(false);

  const handleSubmit = async () => {
    if (!preview || submitRef.current) return;
    submitRef.current = true;
    setUploading(true);
    setError(null);

    try {
      const res = await fetch(preview.data);
      const blob = await res.blob();
      const file = new File([blob], preview.name, { type: preview.type });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);

      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      } else {
        let guestId = localStorage.getItem("guest_id");
        if (!guestId) {
          guestId = crypto.randomUUID();
          localStorage.setItem("guest_id", guestId);
        }
        headers["X-Guest-ID"] = guestId;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload`,
        {
          method: "POST",
          headers,
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Upload failed. Please try again.");
      }

      sessionStorage.removeItem("upload_file_data");
      sessionStorage.removeItem("upload_file_name");
      sessionStorage.removeItem("upload_file_size");
      sessionStorage.removeItem("upload_file_type");

      router.push(`/upload/processing?id=${result.contract_id}`);
    } catch (err: any) {
      setError(err.message || "Unexpected error. Please try again.");
      setUploading(false);
      submitRef.current = false;
    }
  };

  if (!preview) return null;

  const isPDF = preview.type === "application/pdf";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-4">
          <button
            onClick={() => router.replace("/upload")}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium mb-3 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {uiLang === "ne" ? "फिर्ता" : "Back"}
          </button>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {uiLang === "ne"
              ? "समीक्षा र पुष्टि गर्नुहोस्"
              : "Review & Confirm"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {uiLang === "ne"
              ? "विश्लेषणका लागि पेश गर्नु अघि सम्झौता पुष्टि गर्नुहोस्।"
              : "Confirm your contract before submitting for analysis."}
          </p>
        </div>

        {/* Preview card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {!isPDF && (
            <div className="w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4">
              <img
                src={preview.data}
                alt="Contract preview"
                className="max-h-48 object-contain rounded-lg shadow-sm"
              />
            </div>
          )}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {preview.name}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatBytes(preview.size)} ·{" "}
                {isPDF ? "PDF" : preview.type.split("/")[1].toUpperCase()}
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
              ✓ Ready
            </span>
          </div>
        </div>

        {/* Language selector */}
        <div className="mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              {uiLang === "ne" ? "रिपोर्ट भाषा" : "Report Language"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {uiLang === "ne"
                ? "छानेको भाषामा रिपोर्ट तयार हुनेछ"
                : "Report generated in selected language"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                disabled={uploading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  language === lang.code
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-teal-400 hover:text-teal-600"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        {/* What happens next */}
        <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            {uiLang === "ne" ? "के हुन्छ अर्को?" : "What happens next?"}
          </p>
          <div className="flex items-start justify-between">
            {[
              {
                step: "1",
                label: uiLang === "ne" ? "स्क्यान" : "Scan contract",
                icon: "📄",
              },
              {
                step: "2",
                label: uiLang === "ne" ? "जोखिम पहिचान" : "Detect risks",
                icon: "⚠️",
              },
              {
                step: "3",
                label: uiLang === "ne" ? "रिपोर्ट पाउनुस्" : "Get report",
                icon: "🛡",
              },
            ].map((item, i, arr) => (
              <div key={item.step} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-base">
                    {item.icon}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center leading-tight">
                    {item.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-10 h-px bg-slate-200 dark:bg-slate-700 mb-4 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-teal-300 dark:disabled:bg-teal-900 text-white text-sm font-semibold transition-colors"
          >
            {uploading
              ? uiLang === "ne"
                ? "अपलोड हुँदै..."
                : "Uploading..."
              : uiLang === "ne"
                ? "पुष्टि गरी पेश गर्नुहोस्"
                : "Confirm & Submit"}
          </button>
          <button
            onClick={handleClear}
            disabled={uploading}
            className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 text-xs font-medium transition-colors"
          >
            {uiLang === "ne" ? "पुनः प्रयास / हटाउनुहोस्" : "Retry / Clear"}
          </button>
        </div>
      </main>
    </div>
  );
}
