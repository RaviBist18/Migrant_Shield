"use client";

import { useEffect, useState } from "react";
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
  { code: "ne", label: "नेपाली (Nepali)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "tl", label: "Filipino (Tagalog)" },
  { code: "bn", label: "বাংলা (Bengali)" },
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
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

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

  const handleSubmit = async () => {
    if (!preview || !user) return;
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

      if (!session) throw new Error("Session expired. Please sign in again.");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
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
    }
  };

  if (!preview) return null;

  const isPDF = preview.type === "application/pdf";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.replace("/upload")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium mb-4 transition-colors"
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
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {uiLang === "ne"
              ? "समीक्षा र पुष्टि गर्नुहोस्"
              : "Review & Confirm"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {uiLang === "ne"
              ? "विश्लेषणका लागि पेश गर्नु अघि सम्झौता पुष्टि गर्नुहोस्।"
              : "Confirm your contract before submitting for analysis."}
          </p>
        </div>

        {/* Preview card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {!isPDF && (
            <div className="w-full bg-slate-100 flex items-center justify-center p-4">
              <img
                src={preview.data}
                alt="Contract preview"
                className="max-h-72 object-contain rounded-lg shadow-sm"
              />
            </div>
          )}

          {isPDF && (
            <div className="w-full bg-slate-100 flex flex-col items-center justify-center py-12 px-6 gap-3">
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-slate-400"
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
              <p className="text-sm font-semibold text-slate-700 text-center break-all">
                {preview.name}
              </p>
              <p className="text-xs text-slate-400">
                {uiLang === "ne" ? "PDF कागजात" : "PDF Document"}
              </p>
            </div>
          )}

          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                {preview.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatBytes(preview.size)}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
              {isPDF ? "PDF" : preview.type.split("/")[1].toUpperCase()}
            </span>
          </div>
        </div>

        {/* Language selector */}
        <div className="mt-4 bg-white border border-slate-200 rounded-xl px-5 py-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {uiLang === "ne" ? "रिपोर्ट भाषा" : "Report Language"}
          </label>
          <p className="text-xs text-slate-400 mb-3">
            {uiLang === "ne"
              ? "तपाईंको जोखिम रिपोर्ट यस भाषामा तयार हुनेछ।"
              : "Your risk report will be generated in this language."}
          </p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={uploading}
            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-teal-300 text-white text-sm font-semibold transition-colors"
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
            className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 text-sm font-semibold border border-slate-200 transition-colors"
          >
            {uiLang === "ne" ? "पुनः प्रयास / हटाउनुहोस्" : "Retry / Clear"}
          </button>
        </div>
      </main>
    </div>
  );
}
