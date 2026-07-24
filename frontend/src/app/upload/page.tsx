"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { translations } from "@/lib/i18n/landing";
import type { Lang } from "@/lib/i18n/landing";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "ne") setLang(stored);
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("lang");
      setLang(stored === "ne" ? "ne" : "en");
    };
    window.addEventListener("langchange", sync);
    return () => window.removeEventListener("langchange", sync);
  }, []);

  // Guest allowed — no redirect

  const t = translations[lang].upload;

  const processFile = (file: File | null | undefined) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t.errorType);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t.errorSize);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("upload_file_data", reader.result as string);
      sessionStorage.setItem(
        "upload_file_name",
        file.name || "pasted-image.png",
      );
      sessionStorage.setItem("upload_file_size", String(file.size));
      sessionStorage.setItem("upload_file_type", file.type);
      router.push("/upload/preview");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
  };

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && ALLOWED_MIME_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [lang]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-lg mx-auto px-4 pb-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 group text-slate-400 hover:text-slate-900 text-sm font-medium transition-colors duration-200 mb-6 mt-6"
        >
          <svg
            className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:-translate-x-0.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 8H3M7 4L3 8l4 4" />
          </svg>
          {t.dashboardLink}
        </Link>
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            {t.heading}
          </h1>
          <p className="mt-4 text-sm text-slate-500">{t.subheading}</p>
        </div>

        {/* Upload zone */}
        <div
          className={`mt-4 relative border-2 border-dashed rounded-2xl bg-white dark:bg-slate-900 p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer group transition-all duration-200 ${
            isDragOver
              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[1.01]"
              : "border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/20"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-8 h-8 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.tapToSelect}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {t.tapSub}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
              {lang === "ne"
                ? "वा तान्नुहोस् · वा पेस्ट गर्नुहोस् (Ctrl+V)"
                : "or drag & drop · or paste (Ctrl+V)"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              JPG
            </span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              PNG
            </span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              WEBP
            </span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              PDF
            </span>
            <span className="text-slate-300">·</span>
            <span>max 15MB</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { icon: "🔒", text: lang === "ne" ? "एन्क्रिप्टेड" : "Encrypted" },
            {
              icon: "⚡",
              text: lang === "ne" ? "६० सेकेन्ड" : "~60s analysis",
            },
            {
              icon: "🛡",
              text: lang === "ne" ? "१४ कानून" : "14 laws checked",
            },
          ].map((item) => (
            <div
              key={item.text}
              className="flex flex-col items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-2"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-400 text-center">
          {t.securityNote}
        </p>
        <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {lang === "ne"
              ? "यो AI-आधारित कानुनी जानकारी हो, कानुनी सल्लाह होइन। आफ्नो अवस्थाका लागि दूतावास वा योग्य वकिलसँग सम्पर्क गर्नुहोस्।"
              : "AI-generated legal information about your contract — not legal advice. Consult your embassy or a qualified lawyer for your specific situation."}
          </p>
        </div>
      </main>
    </div>
  );
}
