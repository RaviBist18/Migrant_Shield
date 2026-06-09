"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  ShieldCheck,
  Scale,
  BookOpen,
  FileText,
  Globe,
  ChevronDown,
} from "lucide-react";

// =============================================================
// TYPES
// =============================================================
interface ContractFlag {
  flag_id: string;
  flag_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  clause_text: string | null;
  recommendation: string;
  mitigation_steps: string[];
  legal_references: string[];
  created_at: string;
}

interface SharedReportData {
  contract_id: string;
  worker_name: string | null;
  employer_name: string | null;
  country: string | null;
  original_filename: string | null;
  upload_date: string | null;
  analyzed_at: string | null;
  language: string;
  risk_score: number;
  flags: ContractFlag[];
  flags_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
}

type Verdict = "SAFE" | "CAUTION" | "CRITICAL";
type TabKey = "critical" | "warning" | "info" | "all";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// =============================================================
// HELPERS
// =============================================================
function getVerdict(score: number): Verdict {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "CAUTION";
  return "SAFE";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const severityConfig = {
  critical: {
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    badge: "bg-red-500/10 text-red-400 border border-red-500/20",
    border: "border-l-red-500",
    label: "Critical",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    border: "border-l-amber-500",
    label: "Warning",
  },
  info: {
    icon: <CheckCircle className="w-4 h-4 text-blue-400" />,
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    border: "border-l-blue-400",
    label: "Info",
  },
};

// =============================================================
// FLAG CARD
// =============================================================
function FlagCard({
  flag,
  expanded,
  onToggle,
}: {
  flag: ContractFlag;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = severityConfig[flag.severity];
  return (
    <div
      className={`bg-slate-800/50 border border-slate-700/60 border-l-4 ${cfg.border} rounded-xl overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-start gap-3 text-left hover:bg-slate-700/30 transition-colors"
      >
        <span className="mt-0.5 shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            {flag.flag_type && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                {flag.flag_type.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100">{flag.title}</p>
          {!expanded && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
              {flag.description}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/40 pt-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            {flag.description}
          </p>

          {flag.clause_text && (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Clause
              </p>
              <p className="text-xs text-slate-400 italic leading-relaxed">
                "{flag.clause_text}"
              </p>
            </div>
          )}

          {flag.recommendation && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Recommendation
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {flag.recommendation}
              </p>
            </div>
          )}

          {flag.mitigation_steps?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                Steps
              </p>
              <ul className="space-y-1">
                {flag.mitigation_steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-300">
                    <span className="text-slate-600 shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {flag.legal_references?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                Legal References
              </p>
              <div className="flex flex-wrap gap-1.5">
                {flag.legal_references.map((ref, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// MAIN PAGE
// =============================================================
export default function SharedReportPage() {
  const params = useParams();
  const token = params?.token as string;

  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shared/${token}`);
        if (res.status === 410) {
          const d = await res.json();
          setError(d.detail || "This share link has expired or been revoked.");
          return;
        }
        if (!res.ok) {
          setError("Share link not found or invalid.");
          return;
        }
        const data = await res.json();
        setReport(data);
      } catch {
        setError("Failed to load report. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-slate-500 text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Report Unavailable</p>
          <p className="text-slate-400 text-sm">{error || "Unknown error."}</p>
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">
              Protect your rights with AI-powered contract analysis.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> MigrantShield
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Report ───────────────────────────────────────────────
  const verdict = getVerdict(report.risk_score);
  const score = report.risk_score;

  const verdictConfig = {
    SAFE: {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      bar: "bg-emerald-500",
      label: "Low Risk",
    },
    CAUTION: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      bar: "bg-amber-500",
      label: "Caution",
    },
    CRITICAL: {
      icon: <XCircle className="w-6 h-6 text-red-400" />,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      bar: "bg-red-500",
      label: "High Risk",
    },
  }[verdict];

  const tabFlags = {
    all: [...report.flags].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    ),
    critical: report.flags.filter((f) => f.severity === "critical"),
    warning: report.flags.filter((f) => f.severity === "warning"),
    info: report.flags.filter((f) => f.severity === "info"),
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: report.flags_count },
    { key: "critical", label: "Critical", count: report.critical_count },
    { key: "warning", label: "Warnings", count: report.warning_count },
    { key: "info", label: "Info", count: report.info_count },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* ── Header ── */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white tracking-tight">
              MigrantShield
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Shared Report
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* ── Risk Score Card ── */}
        <div className={`rounded-2xl border p-5 ${verdictConfig.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {verdictConfig.icon}
              <div>
                <p className={`text-lg font-bold ${verdictConfig.color}`}>
                  {verdictConfig.label}
                </p>
                <p className="text-xs text-slate-400">
                  Contract Risk Assessment
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black ${verdictConfig.color}`}>
                {score}
              </p>
              <p className="text-xs text-slate-500">/ 100</p>
            </div>
          </div>
          <div className="w-full bg-slate-700/40 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${verdictConfig.bar}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* ── Contract Meta ── */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contract Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Worker", value: report.worker_name },
              { label: "Employer", value: report.employer_name },
              { label: "Country", value: report.country },
              { label: "File", value: report.original_filename },
              { label: "Uploaded", value: fmtDate(report.upload_date) },
              { label: "Analyzed", value: fmtDate(report.analyzed_at) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-sm text-slate-200 font-medium truncate">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Critical",
              count: report.critical_count,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-500/20",
            },
            {
              label: "Warnings",
              count: report.warning_count,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              label: "Info",
              count: report.info_count,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
          ].map(({ label, count, color, bg }) => (
            <div
              key={label}
              className={`rounded-xl border p-3 text-center ${bg}`}
            >
              <p className={`text-2xl font-black ${color}`}>{count}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Flags ── */}
        {report.flags_count > 0 && (
          <div>
            {/* Tabs */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeTab === t.key
                      ? "bg-slate-700 text-white border border-slate-600"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === t.key
                        ? "bg-slate-600 text-slate-200"
                        : "bg-slate-700/50 text-slate-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Flag list */}
            <div className="space-y-2">
              {tabFlags[activeTab].length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No {activeTab} flags.
                </div>
              ) : (
                tabFlags[activeTab].map((flag) => (
                  <FlagCard
                    key={flag.flag_id}
                    flag={flag}
                    expanded={expanded === flag.flag_id}
                    onToggle={() =>
                      setExpanded(
                        expanded === flag.flag_id ? null : flag.flag_id,
                      )
                    }
                  />
                ))
              )}
            </div>
          </div>
        )}

        {report.flags_count === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 font-semibold text-sm">
              No issues detected
            </p>
            <p className="text-slate-400 text-xs mt-1">
              This contract passed all checks.
            </p>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 text-center">
          <Scale className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white mb-1">
            Analyse your own contract
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Free AI-powered risk analysis for migrant workers. Know your rights
            before you sign.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Shield className="w-4 h-4" /> Get started free
          </a>
        </div>

        {/* ── Footer ── */}
        <div className="text-center pb-4">
          <p className="text-[10px] text-slate-600">
            This report was generated by MigrantShield AI and shared by the
            contract owner. It is for informational purposes only and does not
            constitute legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}
