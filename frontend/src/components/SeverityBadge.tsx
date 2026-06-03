import { Severity } from '@/types';

const CONFIG: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: {
    bg: 'bg-red-950',
    text: 'text-red-400',
    border: 'border-red-600',
    label: 'CRITICAL',
  },
  WARNING: {
    bg: 'bg-amber-950',
    text: 'text-amber-400',
    border: 'border-amber-600',
    label: 'WARNING',
  },
  SAFE: {
    bg: 'bg-emerald-950',
    text: 'text-emerald-400',
    border: 'border-emerald-700',
    label: 'SAFE',
  },
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const c = CONFIG[severity];
  return (
    <span
      className={`inline-block px-3 py-1 rounded-sm text-xs font-black tracking-widest border ${c.bg} ${c.text} ${c.border}`}
    >
      {c.label}
    </span>
  );
}