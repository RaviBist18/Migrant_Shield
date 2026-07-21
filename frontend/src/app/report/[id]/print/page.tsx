"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

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
  created_at: string;
}

interface ReportData {
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveVerdict(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "HIGH RISK", color: "#dc2626" };
  if (score >= 40) return { label: "REVIEW REQUIRED", color: "#d97706" };
  return { label: "LOW RISK", color: "#16a34a" };
}

const FLAG_TYPE_LABELS: Record<string, Record<string, string>> = {
  passport_confiscation: {
    en: "Passport Confiscation",
    ne: "राहदानी जफत",
    hi: "पासपोर्ट जब्ती",
    ar: "مصادرة جواز السفر",
    tl: "Pagkumpiska ng Pasaporte",
    bn: "পাসপোর্ট বাজেয়াপ্ত",
  },
  recruitment_fee: {
    en: "Recruitment Fee",
    ne: "भर्ती शुल्क",
    hi: "भर्ती शुल्क",
    ar: "رسوم التوظيف",
    tl: "Bayad sa Recruitment",
    bn: "নিয়োগ ফি",
  },
  wage_deduction: {
    en: "Wage Deduction",
    ne: "ज्याला कटौती",
    hi: "वेतन कटौती",
    ar: "خصم الأجر",
    tl: "Pagbabawas ng Sahod",
    bn: "মজুরি কর্তন",
  },
  movement_restriction: {
    en: "Movement Restriction",
    ne: "आवागमन प्रतिबन्ध",
    hi: "आवाजाही प्रतिबंध",
    ar: "تقييد حرية التنقل",
    tl: "Paghihigpit sa Kilusan",
    bn: "চলাচলে বিধিনিষেধ",
  },
  no_termination_right: {
    en: "No Termination Right",
    ne: "अन्त्य गर्ने अधिकार छैन",
    hi: "समाप्ति का अधिकार नहीं",
    ar: "لا حق في إنهاء العقد",
    tl: "Walang Karapatang Wakasan",
    bn: "চুক্তি বাতিলের অধিকার নেই",
  },
  debt_bondage: {
    en: "Debt Bondage",
    ne: "ऋण बन्धन",
    hi: "ऋण बंधन",
    ar: "عبودية الديون",
    tl: "Pagkaalipin sa Utang",
    bn: "ঋণ দাসত্ব",
  },
  deportation_threat: {
    en: "Deportation Threat",
    ne: "निष्कासनको धम्की",
    hi: "निर्वासन की धमकी",
    ar: "التهديد بالترحيل",
    tl: "Banta ng Deportasyon",
    bn: "বহিষ্কারের হুমকি",
  },
  excessive_working_hours: {
    en: "Excessive Working Hours",
    ne: "अत्यधिक काम घण्टा",
    hi: "अत्यधिक कार्य घंटे",
    ar: "ساعات عمل مفرطة",
    tl: "Labis na Oras ng Trabaho",
    bn: "অতিরিক্ত কাজের সময়",
  },
  below_minimum_wage: {
    en: "Below Minimum Wage",
    ne: "न्यूनतम ज्यालाभन्दा कम",
    hi: "न्यूनतम वेतन से कम",
    ar: "أقل من الحد الأدنى للأجر",
    tl: "Mababa sa Minimum Wage",
    bn: "ন্যূনতম মজুরির নিচে",
  },
  excessive_probation: {
    en: "Excessive Probation",
    ne: "अत्यधिक परिवीक्षा अवधि",
    hi: "अत्यधिक परिवीक्षा अवधि",
    ar: "فترة تجربة مفرطة",
    tl: "Labis na Probation",
    bn: "অতিরিক্ত পরীক্ষামূলক সময়",
  },
  excessive_notice_period: {
    en: "Excessive Notice Period",
    ne: "अत्यधिक सूचना अवधि",
    hi: "अत्यधिक नोटिस अवधि",
    ar: "فترة إشعار مفرطة",
    tl: "Labis na Notice Period",
    bn: "অতিরিক্ত নোটিশ সময়",
  },
  one_sided_termination: {
    en: "One-Sided Termination",
    ne: "एकतर्फी समाप्ति",
    hi: "एकतरफा समाप्ति",
    ar: "إنهاء عقد أحادي الجانب",
    tl: "Isang Panig na Pagwawakas",
    bn: "একতরফা চুক্তি বাতিল",
  },
  no_rest_days: {
    en: "No Rest Days",
    ne: "बिदाको उल्लेख छैन",
    hi: "आराम के दिन नहीं",
    ar: "لا أيام راحة",
    tl: "Walang Rest Days",
    bn: "বিশ্রামের দিন নেই",
  },
  vague_salary: {
    en: "Vague Salary Terms",
    ne: "अस्पष्ट तलब शर्तहरू",
    hi: "अस्पष्ट वेतन शर्तें",
    ar: "شروط راتب غامضة",
    tl: "Malabong Kondisyon ng Sahod",
    bn: "অস্পষ্ট বেতনের শর্ত",
  },
  auto_renewal: {
    en: "Automatic Renewal",
    ne: "स्वचालित नवीकरण",
    hi: "स्वचालित नवीनीकरण",
    ar: "تجديد تلقائي",
    tl: "Awtomatikong Renewal",
    bn: "স্বয়ংক্রিয় নবায়ন",
  },
  resignation_penalty: {
    en: "Resignation Penalty",
    ne: "राजीनामा जरिवाना",
    hi: "इस्तीफा दंड",
    ar: "غرامة الاستقالة",
    tl: "Parusa sa Pagbibitiw",
    bn: "পদত্যাগের জরিমানা",
  },
  language_barrier: {
    en: "Language Barrier",
    ne: "भाषा बाधा",
    hi: "भाषा बाधा",
    ar: "حاجز اللغة",
    tl: "Hadlang sa Wika",
    bn: "ভাষার বাধা",
  },
  no_dispute_resolution: {
    en: "No Dispute Resolution",
    ne: "विवाद समाधान छैन",
    hi: "विवाद समाधान नहीं",
    ar: "لا آلية لحل النزاعات",
    tl: "Walang Dispute Resolution",
    bn: "বিরোধ নিষ্পত্তির ব্যবস্থা নেই",
  },
  missing_employer_details: {
    en: "Missing Employer Details",
    ne: "नियोक्ताको विवरण छैन",
    hi: "नियोक्ता विवरण अनुपस्थित",
    ar: "بيانات صاحب العمل مفقودة",
    tl: "Kulang na Detalye ng Employer",
    bn: "নিয়োগকর্তার তথ্য অনুপস্থিত",
  },
  no_health_insurance: {
    en: "No Health Insurance",
    ne: "स्वास्थ्य बीमा छैन",
    hi: "स्वास्थ्य बीमा नहीं",
    ar: "لا تأمين صحي",
    tl: "Walang Health Insurance",
    bn: "স্বাস্থ্য বীমা নেই",
  },
  no_jurisdiction: {
    en: "No Jurisdiction Specified",
    ne: "न्यायक्षेत्र उल्लेख छैन",
    hi: "क्षेत्राधिकार निर्दिष्ट नहीं",
    ar: "لا ولاية قضائية محددة",
    tl: "Walang Tinukoy na Jurisdiction",
    bn: "কোনো এখতিয়ার নির্দিষ্ট নেই",
  },
};

const DESTINATION_SUPPORT: Record<
  string,
  { name: string; detail: string; contact: string }[]
> = {
  "united arab emirates": [
    {
      name: "UAE Ministry of Human Resources & Emiratisation (MOHRE)",
      detail: "Labor complaints, contract disputes, wage issues",
      contact: "Hotline: 800-60 (toll-free, UAE)",
    },
    {
      name: "Embassy of Nepal, Abu Dhabi",
      detail: "Consular support, repatriation assistance for Nepali workers",
      contact: "Phone: +971-2-4432500",
    },
  ],
  qatar: [
    {
      name: "Qatar Ministry of Labour",
      detail: "Labor complaints, wage protection system inquiries",
      contact: "Hotline: 16008 (toll-free, Qatar)",
    },
    {
      name: "Embassy of Nepal, Doha",
      detail: "Consular support, repatriation assistance for Nepali workers",
      contact: "Phone: +974-4468-1188",
    },
  ],
  "saudi arabia": [
    {
      name: "Saudi Ministry of Human Resources & Social Development",
      detail: "Labor complaints, contract disputes",
      contact: "Hotline: 19911 (toll-free, Saudi Arabia)",
    },
    {
      name: "Embassy of Nepal, Riyadh",
      detail: "Consular support, repatriation assistance for Nepali workers",
      contact: "Phone: +966-11-4880427",
    },
  ],
  malaysia: [
    {
      name: "Malaysia Department of Labour",
      detail: "Labor complaints, contract disputes",
      contact: "Hotline: 03-8000-8000",
    },
    {
      name: "Embassy of Nepal, Kuala Lumpur",
      detail: "Consular support, repatriation assistance for Nepali workers",
      contact: "Phone: +60-3-4256-3037",
    },
  ],
  kuwait: [
    {
      name: "Kuwait Public Authority of Manpower",
      detail: "Labor complaints, contract disputes",
      contact: "Hotline: 128",
    },
    {
      name: "Embassy of Nepal, Kuwait City",
      detail: "Consular support, repatriation assistance for Nepali workers",
      contact: "Phone: +965-2532-5735",
    },
  ],
};

function getDestinationSupport(country: string | null) {
  if (!country) return [];
  return DESTINATION_SUPPORT[country.trim().toLowerCase()] ?? [];
}

function resolveFlagTypeLabel(flagType: string, lang: string): string {
  const key = flagType?.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return (
    FLAG_TYPE_LABELS[key]?.[lang] ??
    FLAG_TYPE_LABELS[key]?.["en"] ??
    flagType?.replace(/_/g, " ")
  );
}

function severityColor(severity: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity.toLowerCase()) {
    case "critical":
      return { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" };
    case "warning":
      return { bg: "#fffbeb", text: "#d97706", border: "#fcd34d" };
    default:
      return { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" };
  }
}

// =============================================================
// COMPONENT
// =============================================================
export default function PrintReportPage() {
  const params = useParams();
  const contractId = params?.id as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [report, setReport] = useState<ReportData | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Fetch session + report
  const fetchAll = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setError("Not authenticated.");
      return;
    }
    setEmail(session.user.email ?? null);

    try {
      const res = await fetch(`${API_BASE}/report/${contractId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ReportData = await res.json();
      setReport(data);
      setReady(true);
    } catch (err: any) {
      setError(err.message || "Failed to load report.");
    }
  }, [contractId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-print once data is ready
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const element = document.getElementById("print-content");
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        ignoreElements: (el) => el.id === "no-print",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`migrantshield-report-${contractId.slice(0, 8)}.pdf`);
      setTimeout(() => window.close(), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, [ready]);

  // =============================================================
  // STATES
  // =============================================================
  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", color: "#dc2626" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "sans-serif",
          color: "#475569",
          textAlign: "center",
        }}
      >
        <p>Preparing document...</p>
      </div>
    );
  }

  const verdict = resolveVerdict(report.risk_score);
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <>
      {/* Print + screen styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Georgia', serif;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          line-height: 1.6;
        }
        .page {
          max-width: 780px;
          margin: 0 auto;
          padding: 40px 48px;
        }
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; color: #0f172a !important; }
          .page { padding: 20px 24px; }
          .flag-card { page-break-inside: avoid; }
          .section { page-break-inside: avoid; }
          .support-hub { page-break-inside: avoid; }
        }
        h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
        h2 { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; letter-spacing: 0.03em; text-transform: uppercase; }
        h3 { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        p { color: #334155; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
        .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .meta-item {}
        .meta-value { font-size: 13px; color: #0f172a; font-weight: 500; word-break: break-all; }
        .verdict-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px 24px;
          margin-bottom: 8px;
        }
        .verdict-label {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .score-row { display: flex; align-items: center; gap: 16px; margin-top: 10px; }
        .score-num { font-size: 36px; font-weight: 900; }
        .score-bar-bg { flex: 1; background: #f1f5f9; border-radius: 4px; height: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .score-bar-fill { height: 100%; border-radius: 4px; }
        .counts-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
        .count-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
        .count-num { font-size: 22px; font-weight: 900; }
        .count-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .flag-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          border-left-width: 4px;
        }
        .flag-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .severity-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .flag-type { font-size: 11px; color: #94a3b8; }
        .flag-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .field-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; margin-top: 10px; }
        .clause-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 8px 10px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #334155;
          line-height: 1.5;
        }
        .rec-text { font-size: 12px; color: #334155; line-height: 1.6; }
        .support-hub {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px 24px;
        }
        .org-row { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
        .org-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .org-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .org-detail { font-size: 12px; color: #475569; }
        .disclaimer {
          margin-top: 28px;
          padding: 14px 16px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          font-size: 11px;
          color: #1e40af;
          line-height: 1.6;
        }
        .print-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 28px;
        }
        .print-btn:hover { background: #1e293b; }
      `}</style>

      <div className="page" id="print-content">
        {/* Manual print button (hidden on print) */}
        <div id="no-print" className="no-print" style={{ marginBottom: 0 }}>
          <button className="print-btn" onClick={() => window.print()}>
            ⬇ Save as PDF
          </button>
        </div>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              🛡 MigrantShield
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 500,
                marginTop: 3,
              }}
            >
              Employment Contract Risk Report
            </span>
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "14px 18px",
            }}
          >
            <div className="meta-grid">
              <div className="meta-item">
                <div className="label">Report Reference ID</div>
                <div
                  className="meta-value"
                  style={{ fontSize: 11, fontFamily: "monospace" }}
                >
                  {report.contract_id}
                </div>
              </div>
              <div className="meta-item">
                <div className="label">Account</div>
                <div className="meta-value">{email ?? "—"}</div>
              </div>
              <div className="meta-item">
                <div className="label">Generated</div>
                <div className="meta-value">{generatedAt}</div>
              </div>
              <div className="meta-item">
                <div className="label">File</div>
                <div className="meta-value">
                  {report.original_filename ?? "—"}
                </div>
              </div>
              {report.worker_name && (
                <div className="meta-item">
                  <div className="label">Worker</div>
                  <div className="meta-value">{report.worker_name}</div>
                </div>
              )}
              {report.employer_name && (
                <div className="meta-item">
                  <div className="label">Employer</div>
                  <div className="meta-value">{report.employer_name}</div>
                </div>
              )}
              {report.country && (
                <div className="meta-item">
                  <div className="label">Destination Country</div>
                  <div className="meta-value">{report.country}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* ── SECTION 1: EXECUTIVE SUMMARY ── */}
        <div className="section" style={{ marginBottom: 28 }}>
          <h2>Section 1 — Executive Risk Summary</h2>
          <div className="verdict-box">
            <div className="verdict-label" style={{ color: verdict.color }}>
              {verdict.label}
            </div>
            <div className="score-row">
              <div className="score-num" style={{ color: verdict.color }}>
                {report.risk_score}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}
                >
                  Risk Score out of 100
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${report.risk_score}%`,
                      background: verdict.color,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="counts-row">
              <div className="count-box">
                <div className="count-num" style={{ color: "#dc2626" }}>
                  {report.critical_count}
                </div>
                <div className="count-lbl" style={{ color: "#dc2626" }}>
                  Critical
                </div>
              </div>
              <div className="count-box">
                <div className="count-num" style={{ color: "#d97706" }}>
                  {report.warning_count}
                </div>
                <div className="count-lbl" style={{ color: "#d97706" }}>
                  Warning
                </div>
              </div>
              <div className="count-box">
                <div className="count-num" style={{ color: "#475569" }}>
                  {report.info_count}
                </div>
                <div className="count-lbl" style={{ color: "#475569" }}>
                  Info
                </div>
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#334155",
              marginTop: 12,
              lineHeight: 1.7,
            }}
          >
            {report.risk_score >= 70
              ? `This contract contains serious legal risks. ${report.critical_count} critical issue${report.critical_count !== 1 ? "s were" : " was"} detected that may expose the worker to wage theft, document confiscation, illegal fees, or unsafe working conditions. Do not sign this contract without consulting a legal professional.`
              : report.risk_score >= 40
                ? `This contract requires careful review before signing. ${report.warning_count} concern${report.warning_count !== 1 ? "s were" : " was"} identified that may disadvantage the worker. Seek clarification on the flagged clauses and consider consulting a legal aid organization.`
                : `This contract appears relatively safe based on AI analysis. Minor informational items were noted. Always read the full contract carefully and confirm all verbal promises are reflected in writing before signing.`}
          </p>
        </div>

        <hr className="divider" />

        {/* ── SECTION 2: FLAG MATRIX ── */}
        <div className="section" style={{ marginBottom: 28 }}>
          <h2>
            Section 2 — Detailed Risk Flag Matrix ({report.flags_count} Issues)
          </h2>
          {report.flags.length === 0 ? (
            <p style={{ color: "#16a34a", fontWeight: 600 }}>
              No risk flags detected.
            </p>
          ) : (
            report.flags.map((flag, idx) => {
              const sc = severityColor(flag.severity);
              const borderColor =
                flag.severity === "critical"
                  ? "#dc2626"
                  : flag.severity === "warning"
                    ? "#d97706"
                    : "#94a3b8";
              return (
                <div
                  key={flag.flag_id}
                  className="flag-card"
                  style={{ borderLeftColor: borderColor, background: sc.bg }}
                >
                  <div className="flag-header">
                    <span
                      className="severity-badge"
                      style={{
                        background: sc.bg,
                        color: sc.text,
                        borderColor: sc.border,
                      }}
                    >
                      {flag.severity.toUpperCase()}
                    </span>
                    {(() => {
                      const typeLabel = resolveFlagTypeLabel(
                        flag.flag_type,
                        report.language,
                      );
                      if (
                        typeLabel?.trim().toLowerCase() ===
                        flag.title?.trim().toLowerCase()
                      ) {
                        return null;
                      }
                      return <span className="flag-type">{typeLabel}</span>;
                    })()}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: "#94a3b8",
                      }}
                    >
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="flag-title">{flag.title}</div>

                  {flag.clause_text && (
                    <>
                      <div className="field-label">Contract Clause</div>
                      <div className="clause-box">{flag.clause_text}</div>
                    </>
                  )}

                  <div className="field-label">Risk Explanation</div>
                  {(() => {
                    const points = flag.description
                      ? flag.description
                          .split(/(?<=[.!?।])\s+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [];
                    if (points.length <= 1) {
                      return <p className="rec-text">{flag.description}</p>;
                    }
                    return (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                        }}
                      >
                        {points.map((point, i) => (
                          <li
                            key={i}
                            className="rec-text"
                            style={{ marginBottom: 3 }}
                          >
                            {point}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}

                  {(() => {
                    const normalizeSteps = (
                      raw: unknown,
                      fallback: string,
                    ): string[] => {
                      if (Array.isArray(raw) && raw.length > 0)
                        return raw as string[];
                      if (typeof raw === "string" && raw.trim()) {
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed) && parsed.length > 0)
                            return parsed;
                        } catch {
                          return [raw];
                        }
                      }
                      return fallback ? [fallback] : [];
                    };
                    const steps: string[] = normalizeSteps(
                      flag.mitigation_steps,
                      flag.recommendation,
                    );
                    if (steps.length === 0) return null;
                    return (
                      <>
                        <div className="field-label">Recommended Actions</div>
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            color: "#0f172a",
                          }}
                        >
                          {steps.map((step, i) => (
                            <li
                              key={i}
                              className="rec-text"
                              style={{ fontWeight: 500, marginBottom: 4 }}
                            >
                              {step}
                            </li>
                          ))}
                        </ol>
                      </>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>

        <hr className="divider" />

        {/* ── SECTION 3: SUPPORT HUB ── */}
        <div className="section support-hub" style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 16 }}>
            Section 3 — Emergency Resource & Legal Advocacy Hub
          </h2>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
            If you are in a vulnerable situation or need legal help regarding
            your employment contract, contact these organizations immediately.
            All services are free.
          </p>
          {(() => {
            const destSupport = getDestinationSupport(report.country);
            if (destSupport.length === 0) return null;
            return (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "16px 20px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 12,
                  }}
                >
                  In {report.country}
                </div>
                {destSupport.map((org, i) => (
                  <div
                    key={i}
                    className="org-row"
                    style={
                      i === destSupport.length - 1
                        ? {
                            marginBottom: 0,
                            paddingBottom: 0,
                            borderBottom: "none",
                          }
                        : {}
                    }
                  >
                    <div className="org-name">{org.name}</div>
                    <div className="org-detail">{org.contact}</div>
                    <div className="org-detail">Focus: {org.detail}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              General &amp; Nepal-Based Support
            </div>
            <div className="org-row">
              <div className="org-name">
                International Labour Organization (ILO)
              </div>
              <div className="org-detail">
                Website: <strong>ilo.org</strong>
              </div>
              <div className="org-detail">
                Focus: Migrant worker rights, forced labor, recruitment fee
                abuse
              </div>
              <div className="org-detail">
                Email: <strong>ilo@ilo.org</strong>
              </div>
            </div>

            <div className="org-row">
              <div className="org-name">
                Pravasi Nepali Coordination Committee (PNCC)
              </div>
              <div className="org-detail">
                Phone: <strong>+977-1-4102030</strong>
              </div>
              <div className="org-detail">
                Focus: Nepali migrant worker rescue, legal aid, repatriation
                support
              </div>
              <div className="org-detail">
                Website: <strong>pncc.org.np</strong>
              </div>
            </div>

            <div className="org-row">
              <div className="org-name">
                Nepal Foreign Employment Promotion Board (FEPB)
              </div>
              <div className="org-detail">
                Hotline: <strong>1180</strong> (toll-free, Nepal)
              </div>
              <div className="org-detail">
                Focus: Pre-departure guidance, complaint registration, contract
                verification
              </div>
            </div>

            <div className="org-row">
              <div className="org-name">Maiti Nepal</div>
              <div className="org-detail">
                Phone: <strong>+977-1-4720650</strong>
              </div>
              <div className="org-detail">
                Focus: Trafficking, exploitation, emergency rescue for migrant
                workers
              </div>
              <div className="org-detail">
                Website: <strong>maitinepal.org</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="disclaimer">
          <strong style={{ color: "#1e3a8a" }}>Disclaimer:</strong> This report
          is generated by MigrantShield's AI analysis engine for informational
          purposes only. It does not constitute legal advice. Risk scores and
          flag classifications are AI-generated estimates and may not capture
          all legal nuances specific to your jurisdiction. Always consult a
          qualified legal professional before making decisions about your
          employment contract. MigrantShield is a non-profit platform — this
          report is free to share with advocates, NGOs, and legal aid providers.
        </div>

        <div style={{ height: 32 }} />
      </div>
    </>
  );
}
