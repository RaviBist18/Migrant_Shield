import { Severity } from "@/types";

export const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; text: string; border: string }
> = {
  CRITICAL: {
    bg: "bg-red-950",
    text: "text-red-400",
    border: "border-red-600",
  },
  WARNING: {
    bg: "bg-amber-950",
    text: "text-amber-400",
    border: "border-amber-600",
  },
  INFO: { bg: "bg-blue-950", text: "text-blue-400", border: "border-blue-600" },
  SAFE: {
    bg: "bg-emerald-950",
    text: "text-emerald-400",
    border: "border-emerald-700",
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
  SAFE: 3,
};

export const SEVERITY_LABELS: Record<string, Record<Severity, string>> = {
  en: { CRITICAL: "Critical", WARNING: "Warning", INFO: "Info", SAFE: "Safe" },
  ne: {
    CRITICAL: "गम्भीर",
    WARNING: "चेतावनी",
    INFO: "जानकारी",
    SAFE: "सुरक्षित",
  },
  hi: {
    CRITICAL: "गंभीर",
    WARNING: "चेतावनी",
    INFO: "जानकारी",
    SAFE: "सुरक्षित",
  },
  ar: { CRITICAL: "خطير", WARNING: "تحذير", INFO: "معلومات", SAFE: "آمن" },
  tl: {
    CRITICAL: "Kritikal",
    WARNING: "Babala",
    INFO: "Impormasyon",
    SAFE: "Ligtas",
  },
  bn: { CRITICAL: "গুরুতর", WARNING: "সতর্কতা", INFO: "তথ্য", SAFE: "নিরাপদ" },
};

export function getSeverityLabel(severity: Severity, lang: string): string {
  return SEVERITY_LABELS[lang]?.[severity] ?? SEVERITY_LABELS.en[severity];
}
