import { Contract, LanguageOption } from "@/types";

export const MOCK_CONTRACTS: Contract[] = [
  {
    contract_id: "CTR-2024-001",
    worker_name: "Aung Kyaw Zin",
    upload_date: "2024-11-12",
    status: "completed",
    risk_score: 87,
    document_ai_confidence: 91,
    employer_name: "Evergreen Construction Sdn Bhd",
    country_of_work: "Malaysia",
    contract_duration_months: 24,
    flags: [
      {
        issue_id: "ISS-001",
        category: "Fees",
        severity: "CRITICAL",
        title: "Illegal Recruitment Fee Deduction",
        visual_icon: "💸",
        plain_language_explanation:
          'Your employer will take RM 4,500 from your salary every month for 6 months to cover "recruitment costs". This is illegal. You should never pay recruitment fees — the employer must pay these.',
        mitigation_steps: [
          "Do not sign this contract without removing Clause 7.2",
          "Contact the Malaysian Labour Department: 03-8000-8000",
          "Request a copy of the zero-fee policy in writing",
        ],
        ai_confidence: 97,
        contract_clause:
          "Clause 7.2 — Employee shall bear recruitment facilitation costs of RM 4,500 per month deducted over first 6 months of employment.",
      },
      {
        issue_id: "ISS-002",
        category: "Passport",
        severity: "CRITICAL",
        title: "Passport Confiscation Clause",
        visual_icon: "🛂",
        plain_language_explanation:
          "The employer wants to keep your passport at their office. This is illegal in Malaysia and in most countries. Your passport belongs to you — no employer can hold it.",
        mitigation_steps: [
          "Refuse any request to hand over your passport",
          "Keep passport in a secure personal location at all times",
          "Report confiscation to: SUHAKAM 03-2612-5600",
        ],
        ai_confidence: 99,
        contract_clause:
          "Clause 4.1 — Employee travel documents shall be retained by Employer for safekeeping during contract period.",
      },
      {
        issue_id: "ISS-003",
        category: "Hours",
        severity: "WARNING",
        title: "Excessive Overtime Requirement",
        visual_icon: "⏰",
        plain_language_explanation:
          "The contract requires up to 84 hours of work per week. Legal maximum in Malaysia is 48 hours. You cannot be forced to work more than this.",
        mitigation_steps: [
          "Negotiate maximum 48 hours per week in writing",
          "Overtime must be voluntary and paid at 1.5x rate",
          "File complaint at: Labour Department portal",
        ],
        ai_confidence: 88,
        contract_clause:
          "Clause 9.3 — Employee agrees to work up to 12 hours per day including weekends as required by operational needs.",
      },
      {
        issue_id: "ISS-004",
        category: "Wages",
        severity: "WARNING",
        title: "Wage Below Minimum Legal Threshold",
        visual_icon: "📉",
        plain_language_explanation:
          "Your monthly salary of RM 900 is below Malaysia's minimum wage of RM 1,500. This is against the law.",
        mitigation_steps: [
          "Negotiate salary to minimum RM 1,500/month",
          "Request written salary breakdown before signing",
          "Report violations: 1800-88-8333 (JTKSM)",
        ],
        ai_confidence: 94,
        contract_clause:
          "Clause 6.1 — Monthly basic salary: RM 900 inclusive of all allowances.",
      },
      {
        issue_id: "ISS-005",
        category: "Leave",
        severity: "SAFE",
        title: "Annual Leave — Compliant",
        visual_icon: "✅",
        plain_language_explanation:
          "You are entitled to 14 days paid annual leave per year. This meets the legal minimum requirement.",
        mitigation_steps: [],
        ai_confidence: 96,
        contract_clause:
          "Clause 11.1 — Employee entitled to 14 days paid annual leave per calendar year.",
      },
    ],
  },
  {
    contract_id: "CTR-2024-002",
    worker_name: "Priya Sharma",
    upload_date: "2024-11-10",
    status: "processing",
    risk_score: 0,
    document_ai_confidence: 0,
    employer_name: "Gulf Hospitality LLC",
    country_of_work: "Qatar",
    contract_duration_months: 36,
    flags: [],
  },
  {
    contract_id: "CTR-2024-003",
    worker_name: "Md. Rafiqul Islam",
    upload_date: "2024-11-08",
    status: "failed",
    risk_score: 0,
    document_ai_confidence: 0,
    employer_name: "Unknown",
    country_of_work: "Saudi Arabia",
    contract_duration_months: 0,
    flags: [],
  },
];

export const MOCK_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "my", label: "Burmese", native: "မြန်မာဘာသာ", flag: "🇲🇲" },
  { code: "ne", label: "Nepali", native: "नेपाली", flag: "🇳🇵" },
  { code: "bn", label: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "si", label: "Sinhala", native: "සිංහල", flag: "🇱🇰" },
];

export const getMockContract = (id: string): Contract | undefined =>
  MOCK_CONTRACTS.find((c) => c.contract_id === id);

export const getMockFlag = (contractId: string, issueId: string) => {
  const contract = getMockContract(contractId);
  return contract?.flags.find((f) => f.issue_id === issueId);
};
