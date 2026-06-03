import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Settings
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Last updated: June 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using MigrantShield, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users of MigrantShield, including migrant workers, support organizations, and partner NGOs.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">2. Description of Service</h2>
            <p>MigrantShield provides AI-powered analysis of employment contracts for Nepali migrant workers. The platform extracts text from uploaded contracts, identifies potentially risky or illegal clauses against Nepal's Foreign Employment Act 2064, assigns risk scores, and generates plain-language reports.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">3. Not Legal Advice</h2>
            <p className="font-medium text-slate-800 dark:text-slate-200">MigrantShield is not a law firm and does not provide legal advice.</p>
            <p className="mt-2">All analysis is AI-generated and informational only. Findings may not be complete, accurate, or applicable to your specific legal jurisdiction. Always consult a qualified legal professional or contact the Department of Foreign Employment (DoFE) Nepal before making decisions based on our analysis.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">4. User Responsibilities</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>You must be at least 18 years old to use this platform.</li>
              <li>You are responsible for the accuracy of documents you upload.</li>
              <li>You must not upload documents belonging to others without their consent.</li>
              <li>You must not use the platform for any unlawful purpose.</li>
              <li>You must not attempt to reverse-engineer, scrape, or abuse the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">5. Intellectual Property</h2>
            <p>All platform code, design, and content is owned by MigrantShield. You retain full ownership of the contracts and documents you upload. By uploading, you grant MigrantShield a limited license to process your documents solely for the purpose of providing analysis.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">6. Limitation of Liability</h2>
            <p>MigrantShield is provided free of charge on an as-is basis. We are not liable for any decisions made based on our analysis, any errors or omissions in AI-generated reports, or any loss or damage arising from use of the platform. Our total liability to you shall not exceed NPR 0 — this is a free service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">7. Account Termination</h2>
            <p>You may delete your account at any time. We reserve the right to suspend or terminate accounts that violate these terms, abuse the platform, or engage in fraudulent activity.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">8. Changes to Terms</h2>
            <p>We may update these terms as the platform evolves. Continued use after changes constitutes acceptance of the updated terms. We will notify users of significant changes via the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">9. Governing Law</h2>
            <p>These terms are governed by the laws of Nepal. Any disputes shall be resolved under the jurisdiction of Nepali courts.</p>
          </section>

          <section>
  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
    10. Contact
  </h2>

  <p>
    Questions about these terms? Contact us at{' '}
    <a
      href="mailto:legal@migrantshield.org"
      className="font-medium text-slate-800 dark:text-slate-200 underline hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
    >
      ravibist103@gmail.com
    </a>.
  </p>
</section>

        </div>
      </div>
    </div>
  );
}