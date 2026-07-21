import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-slate-900 shrink-0"
            >
              <path d="M16 3L4 8v8c0 6 5.5 10.5 12 13 6.5-2.5 12-7 12-13V8L16 3z" />
              <path d="M13 14h4M13 18h6" />
              <path d="M19 10l-2-2-4 4" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="font-semibold tracking-tight text-lg text-slate-900">
                MigrantShield
              </span>
              <span className="text-xs text-slate-400 font-normal tracking-wide">
                Worker Protection Platform
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mr-20"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              1. Who We Are
            </h2>
            <p>
              MigrantShield is Nepal&apos;s first digital contract protection
              platform for migrant workers. We provide AI-powered employment
              contract analysis to help Nepali workers understand their rights
              before signing contracts for overseas employment in Qatar,
              Malaysia, Saudi Arabia, and other countries.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              2. What We Collect
            </h2>

            <ul className="space-y-2 list-disc list-inside">
              <li>
                <span className="font-medium text-slate-800">
                  Account information
                </span>{" "}
                — your phone number or email address used to create your
                account.
              </li>

              <li>
                <span className="font-medium text-slate-800">
                  Contract files
                </span>{" "}
                — PDFs or images of employment contracts you upload for
                analysis.
              </li>

              <li>
                <span className="font-medium text-slate-800">
                  Analysis data
                </span>{" "}
                — extracted text, identified clauses, risk scores, and flags
                generated from your contracts.
              </li>

              <li>
                <span className="font-medium text-slate-800">Usage data</span> —
                pages visited, features used, and general interaction patterns
                to improve the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              3. How We Use Your Data
            </h2>

            <ul className="space-y-2 list-disc list-inside">
              <li>
                To analyze your employment contracts and generate risk reports.
              </li>
              <li>
                To identify clauses that may violate Nepal&apos;s Foreign
                Employment Act 2064.
              </li>
              <li>To improve our AI analysis accuracy over time.</li>
              <li>
                To communicate important updates about your account or analysis
                results.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              4. Data Isolation and Security
            </h2>

            <p>
              Every user&apos;s data is strictly isolated. Your contracts,
              analysis results, and flagged clauses are accessible only to you.
              We enforce row-level security at the database level — no other
              user can access your data. Contract files are stored securely and
              are never shared with third parties without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              5. AI Analysis Disclaimer
            </h2>

            <p>
              MigrantShield uses AI to analyze contracts. While we strive for
              accuracy, AI analysis may not be complete or
              jurisdiction-specific. Every flag shows the exact extracted clause
              text so you can verify findings yourself. Every flag cites a
              specific law section. This platform is not a substitute for
              qualified legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              6. Data Retention
            </h2>

            <p>
              We retain your contracts and analysis results for as long as your
              account is active. You may request deletion of your account and
              all associated data at any time by contacting us. Upon deletion,
              your data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              7. Your Rights
            </h2>

            <ul className="space-y-2 list-disc list-inside">
              <li>Access the data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>Withdraw consent for data processing at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              8. Contact
            </h2>

            <p>
              For any privacy concerns or data requests, contact us at{" "}
              <a
                href="mailto:ravibist103@gmail.com"
                className="font-medium text-slate-800 underline hover:text-slate-600 transition-colors"
              >
                ravibist103@gmail.com
              </a>
              . We will respond within 7 business days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
