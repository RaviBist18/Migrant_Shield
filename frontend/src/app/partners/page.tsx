import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

const PARTNERS = [
  {
    name: "Department of Foreign Employment (DoFE)",
    type: "Government Body",
    description:
      "Nepal's primary government authority overseeing foreign employment...",
    url: "https://dofe.gov.np",
  },
  {
    name: "National Human Rights Commission (NHRC)",
    type: "Government Commission",
    description:
      "Nepal's constitutional body for the promotion and protection of human rights...",
    url: "https://nhrcnepal.org",
  },
  {
    name: "Pourakhi Nepal",
    type: "NGO",
    description:
      "A leading Nepali NGO dedicated to supporting women migrant workers...",
    url: "https://www.facebook.com/pourakhi",
  },
  {
    name: "Pravasi Nepali Coordination Committee (PNCC)",
    type: "NGO",
    description: "A network organization working on migration governance...",
    url: "https://pncc.org.np",
  },
  {
    name: "Amnesty International Nepal",
    type: "International NGO",
    description: "Documents and campaigns against human rights violations...",
    url: "https://amnestynepal.org",
  },
  {
    name: "ILO Nepal",
    type: "UN Agency",
    description: "The International Labour Organization's Nepal office...",
    url: "https://ilo.org/kathmandu",
  },
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-8 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Settings
        </Link>

        <h1 className="text-3xl font-bold mb-2">
          Partner NGOs & Organizations
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          MigrantShield works alongside these organizations to protect the
          rights of Nepal's 4 million+ migrant workers.
        </p>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          If you need legal help, reintegration support, or want to report abuse
          — these organizations can help you directly.
        </p>

        <div className="space-y-4">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {partner.name}
                  </h2>
                  <span className="inline-block mt-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {partner.type}
                  </span>
                </div>

                {partner.url !== "#" && (
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {partner.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Want to partner with us?
            </span>{" "}
            If your organization works with Nepali migrant workers and wants to
            be listed here, contact us at{" "}
            <a
              href="mailto:ravibist103@gmail.com"
              className="font-medium text-slate-700 dark:text-slate-300 underline hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
            >
              ravibist103@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
