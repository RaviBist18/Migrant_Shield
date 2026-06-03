export type Severity = 'CRITICAL' | 'WARNING' | 'SAFE';
export type Status = 'queued' | 'processing' | 'completed' | 'failed';
export type Category = 'Fees' | 'Passport' | 'Hours' | 'Wages' | 'Termination' | 'Leave';

export interface Flag {
  issue_id: string;
  category: Category;
  severity: Severity;
  title: string;
  visual_icon: string;
  plain_language_explanation: string;
  mitigation_steps: string[];
  ai_confidence: number;
  contract_clause: string;
}

export interface Contract {
  id: string;
  user_id: string;
  worker_name: string;
  employer_name: string;
  country: string;
  upload_date: string;
  status: Status;
  risk_score: number;
  critical_flags_count: number;
}

export type Lang = 'en' | 'ne';

export type Language = 'en' | 'my' | 'ne' | 'bn' | 'si';

export interface LanguageOption {
  code: Language;
  label: string;
  native: string;
  flag: string;
}