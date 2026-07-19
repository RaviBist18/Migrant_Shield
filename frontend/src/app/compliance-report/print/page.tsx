"use client";

import { useEffect, useState } from "react";

// ─── Types (mirror from main page) ───────────────────────────────────────────
type Lang = "en" | "ne" | "hi" | "ar" | "tl" | "bn";

interface Answers {
  lang: Lang;
  name: string;
  origin: string;
  destination: string;
  job: string;
  departure: string | null;
}

interface ReportData {
  corridor: string;
  illegal: { point: string; source: string }[];
  rights: { point: string; source: string }[];
  checklist: string[];
  emergency: { label: string; number: string }[];
  warnings: string[];
  coverage: "full" | "partial";
  generatedAt: string;
}

// ─── Static label maps (English only for PDF — universal) ────────────────────
const UI: Record<Lang, Record<string, string>> = {
  en: {
    illegal: "ILLEGAL — Employer CANNOT do this",
    rights: "YOUR LEGAL RIGHTS",
    checklist: "DEMAND BEFORE SIGNING",
    emergency: "EMERGENCY CONTACTS",
    warnings: "COMMON RISKS IN THIS CORRIDOR",
    disclaimer:
      "Legal terms in English are authoritative. This is general guidance, not legal advice.",
    generated: "Generated on",
    coverage_full: "Full legal coverage",
    coverage_partial: "Partial coverage — ILO standards applied",
    urgency: "Departing soon — read ILLEGAL section first",
  },
  ne: {
    illegal: "अवैध — नियोक्ताले गर्न नपाउने",
    rights: "तपाईंका कानुनी अधिकारहरू",
    checklist: "हस्ताक्षर गर्नु अघि माग गर्नुहोस्",
    emergency: "आपतकालीन सम्पर्क",
    warnings: "यस कोरिडरमा सामान्य जोखिमहरू",
    disclaimer:
      "अंग्रेजी कानुनी शब्दहरू अधिकारिक छन्। यो सामान्य मार्गदर्शन हो, कानुनी सल्लाह होइन।",
    generated: "बनाइएको मिति",
    coverage_full: "पूर्ण कानुनी कभरेज",
    coverage_partial: "आंशिक कभरेज — ILO मापदण्ड लागू",
    urgency: "छिट्टै प्रस्थान — पहिले अवैध खण्ड पढ्नुहोस्",
  },
  hi: {
    illegal: "अवैध — नियोक्ता यह नहीं कर सकता",
    rights: "आपके कानूनी अधिकार",
    checklist: "हस्ताक्षर से पहले माँगें",
    emergency: "आपातकालीन संपर्क",
    warnings: "इस कॉरिडोर में सामान्य जोखिम",
    disclaimer:
      "अंग्रेजी कानूनी शब्द प्रामाणिक हैं। यह सामान्य मार्गदर्शन है, कानूनी सलाह नहीं।",
    generated: "बनाने की तिथि",
    coverage_full: "पूर्ण कानूनी कवरेज",
    coverage_partial: "आंशिक कवरेज — ILO मानक लागू",
    urgency: "जल्द प्रस्थान — पहले अवैध अनुभाग पढ़ें",
  },
  ar: {
    illegal: "غير قانوني — لا يحق لصاحب العمل فعل ذلك",
    rights: "حقوقك القانونية",
    checklist: "اطلب قبل التوقيع",
    emergency: "جهات الاتصال في حالات الطوارئ",
    warnings: "المخاطر الشائعة في هذا الممر",
    disclaimer:
      "المصطلحات القانونية باللغة الإنجليزية هي المرجع. هذا توجيه عام وليس استشارة قانونية.",
    generated: "تاريخ الإنشاء",
    coverage_full: "تغطية قانونية كاملة",
    coverage_partial: "تغطية جزئية — معايير منظمة العمل الدولية مطبقة",
    urgency: "المغادرة قريبًا — اقرأ قسم الغير قانوني أولاً",
  },
  tl: {
    illegal: "ILEGAL — Hindi Maaaring Gawin ng Employer",
    rights: "MGA LEGAL NA KARAPATAN MO",
    checklist: "HINGIN BAGO PUMIRMA",
    emergency: "MGA EMERGENCY NA CONTACT",
    warnings: "MGA KARANIWANG PANGANIB SA CORRIDOR NA ITO",
    disclaimer:
      "Ang mga legal na termino sa Ingles ang awtoridad. Ito ay pangkalahatang gabay, hindi legal na payo.",
    generated: "Nabuo noong",
    coverage_full: "Buong legal na saklaw",
    coverage_partial: "Bahagyang saklaw — ILO pamantayan ang inilapat",
    urgency: "Malapit na umalis — basahin muna ang ILEGAL na seksyon",
  },
  bn: {
    illegal: "অবৈধ — নিয়োগকর্তা এটি করতে পারবেন না",
    rights: "আপনার আইনি অধিকার",
    checklist: "স্বাক্ষর করার আগে দাবি করুন",
    emergency: "জরুরি যোগাযোগ",
    warnings: "এই করিডোরে সাধারণ ঝুঁকি",
    disclaimer:
      "ইংরেজিতে আইনি শর্তাবলী কর্তৃত্বপূর্ণ। এটি সাধারণ নির্দেশিকা, আইনি পরামর্শ নয়।",
    generated: "তৈরির তারিখ",
    coverage_full: "সম্পূর্ণ আইনি কভারেজ",
    coverage_partial: "আংশিক কভারেজ — ILO মান প্রযোজ্য",
    urgency: "শীঘ্রই যাত্রা — প্রথমে অবৈধ অংশ পড়ুন",
  },
};

export default function ComplianceReportPrintPage() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  // Read from sessionStorage
  useEffect(() => {
    try {
      const rawAnswers = sessionStorage.getItem("compliance-answers");
      const rawReport = sessionStorage.getItem("compliance-report");
      if (!rawAnswers || !rawReport) {
        setStatus("error");
        return;
      }
      setAnswers(JSON.parse(rawAnswers));
      setReport(JSON.parse(rawReport));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // Auto-download once ready
  useEffect(() => {
    if (status !== "ready" || !answers || !report) return;

    const timer = setTimeout(async () => {
      try {
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
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [canvas.width / 2, canvas.height / 2],
        });

        pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);

        const corridor =
          `${answers.origin}-${answers.destination}`.toLowerCase();
        pdf.save(`migrantshield-compliance-${corridor}.pdf`);

        const bc = new BroadcastChannel("ms-pdf");
        bc.postMessage("downloaded");
        bc.close();
        setTimeout(() => window.close(), 300);
      } catch (err) {
        console.error("PDF generation failed:", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [status, answers, report]);

  if (status === "loading") {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "sans-serif",
          color: "#475569",
          textAlign: "center",
        }}
      >
        <p>Preparing document…</p>
      </div>
    );
  }

  if (status === "error" || !answers || !report) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", color: "#dc2626" }}>
        <p>
          Error: No report data found. Please go back and generate a report
          first.
        </p>
      </div>
    );
  }

  const t = UI[answers.lang];
  const isRTL = answers.lang === "ar";

  const isUrgent = answers.departure
    ? new Date(answers.departure + "T00:00:00").getTime() - Date.now() <
      7 * 24 * 60 * 60 * 1000
    : false;

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
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
          direction: ${isRTL ? "rtl" : "ltr"};
        }
        h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
        h2 { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
        p { color: #334155; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }

        /* Header */
        .header-meta {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .meta-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .meta-value { font-size: 13px; color: #0f172a; font-weight: 500; }

        /* Urgency */
        .urgency-banner {
          background: #dc2626;
          color: #fff;
          border-radius: 8px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        /* Section */
        .section {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .section-body { padding: 14px 16px; background: #fff; }

        /* Section colors */
        .section-red { border-left: 4px solid #ef4444; }
        .section-red .section-header { background: #fef2f2; color: #991b1b; }
        .section-emerald { border-left: 4px solid #10b981; }
        .section-emerald .section-header { background: #ecfdf5; color: #065f46; }
        .section-blue { border-left: 4px solid #3b82f6; }
        .section-blue .section-header { background: #eff6ff; color: #1e40af; }
        .section-amber { border-left: 4px solid #f59e0b; }
        .section-amber .section-header { background: #fffbeb; color: #92400e; }
        .section-slate { border-left: 4px solid #94a3b8; }
        .section-slate .section-header { background: #f8fafc; color: #334155; }

        /* Items */
        .item-row { display: flex; gap: 10px; margin-bottom: 10px; }
        .item-row:last-child { margin-bottom: 0; }
        .item-num {
          width: 20px; height: 20px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700;
          flex-shrink: 0; margin-top: 2px;
        }
        .item-num-red { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; }
        .item-num-emerald { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; }
        .item-text { font-size: 13px; font-weight: 500; color: #0f172a; line-height: 1.5; }
        .item-source { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px; }

        /* Checklist */
        .check-item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
        .check-box {
          width: 14px; height: 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 3px;
          flex-shrink: 0; margin-top: 2px;
        }

        /* Emergency */
        .emergency-row {
          display: flex; align-items: center; justify-content: space-between;
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
          padding: 10px 14px; margin-bottom: 8px;
        }
        .emergency-label { font-size: 11px; color: #64748b; font-weight: 500; }
        .emergency-number { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: 0.04em; }

        /* Warning */
        .warning-row { display: flex; gap: 8px; margin-bottom: 8px; }
        .warning-icon { color: #d97706; flex-shrink: 0; margin-top: 1px; }

        /* Disclaimer */
        .disclaimer {
          margin-top: 24px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 11px;
          color: #64748b;
          line-height: 1.6;
        }

        /* Coverage badge */
        .coverage-badge {
          display: inline-block;
          font-size: 11px; font-weight: 600;
          padding: 3px 10px; border-radius: 20px;
          margin-top: 6px;
        }
        .coverage-full { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .coverage-partial { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
      `}</style>

      <div className="page" id="print-content">
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
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
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
              Pre-Departure Legal Shield
            </span>
          </div>
          <div className="header-meta">
            {answers.name && (
              <div>
                <div className="meta-label">Prepared For</div>
                <div className="meta-value">{answers.name}</div>
              </div>
            )}
            <div>
              <div className="meta-label">Corridor</div>
              <div className="meta-value">{report.corridor}</div>
            </div>
            <div>
              <div className="meta-label">{t.generated}</div>
              <div className="meta-value">{generatedAt}</div>
            </div>
            {answers.departure && (
              <div>
                <div className="meta-label">Departure Date</div>
                <div className="meta-value">
                  {new Date(answers.departure + "T00:00:00").toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </div>
              </div>
            )}
            <div>
              <div className="meta-label">Coverage</div>
              <div>
                <span
                  className={`coverage-badge ${report.coverage === "full" ? "coverage-full" : "coverage-partial"}`}
                >
                  {report.coverage === "full"
                    ? "✓ " + t.coverage_full
                    : "⚠ " + t.coverage_partial}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── URGENCY BANNER ── */}
        {isUrgent && <div className="urgency-banner">⚡ {t.urgency}</div>}

        <div className="divider" />

        {/* ── ILLEGAL ── */}
        <div className="section section-red">
          <div className="section-header">✕ &nbsp;{t.illegal}</div>
          <div className="section-body">
            {report.illegal.map((item, i) => (
              <div className="item-row" key={i}>
                <div className={`item-num item-num-red`}>{i + 1}</div>
                <div>
                  <div className="item-text">{item.point}</div>
                  <div className="item-source">{item.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHTS ── */}
        <div className="section section-emerald">
          <div className="section-header">✓ &nbsp;{t.rights}</div>
          <div className="section-body">
            {report.rights.map((item, i) => (
              <div className="item-row" key={i}>
                <div className={`item-num item-num-emerald`}>{i + 1}</div>
                <div>
                  <div className="item-text">{item.point}</div>
                  <div className="item-source">{item.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHECKLIST ── */}
        <div className="section section-blue">
          <div className="section-header">☑ &nbsp;{t.checklist}</div>
          <div className="section-body">
            {report.checklist.map((item, i) => (
              <div className="check-item" key={i}>
                <div className="check-box" />
                <div className="item-text">{item}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WARNINGS ── */}
        {report.warnings.length > 0 && (
          <div className="section section-amber">
            <div className="section-header">⚠ &nbsp;{t.warnings}</div>
            <div className="section-body">
              {report.warnings.map((w, i) => (
                <div className="warning-row" key={i}>
                  <span className="warning-icon">⚠</span>
                  <div className="item-text">{w}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EMERGENCY ── */}
        <div className="section section-slate">
          <div className="section-header">☎ &nbsp;{t.emergency}</div>
          <div className="section-body">
            {report.emergency.length === 0 ? (
              <div className="item-text" style={{ color: "#64748b" }}>
                Contact your national embassy for assistance.
              </div>
            ) : (
              report.emergency.map((e, i) => (
                <div className="emergency-row" key={i}>
                  <div>
                    <div className="emergency-label">{e.label}</div>
                    <div className="emergency-number">{e.number}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="disclaimer">
          <strong>Disclaimer:</strong> {t.disclaimer} MigrantShield is a
          non-profit platform — this report is free to share with advocates,
          NGOs, and legal aid providers. Verify critical information with your
          embassy.
        </div>

        <div style={{ height: 24 }} />
      </div>
    </>
  );
}
